import { ObjectId } from 'mongodb'
import { ActivityAction, ActivityEntityType, ExtractionStatus } from '~/constants/enum'
import { EXTRACTION_JOB_LOCK_TTL_MS } from '~/constants/base'
import { DocumentExtractionJob } from '~/models/DocumentExtractionJob.schema'
import { ActivityLog } from '~/models/ActivityLog.schema'
import databaseService from './database.service'

/**
 * Service quản lý vòng đời và trạng thái của các job trích xuất văn bản bất đồng bộ.
 */
class DocumentExtractionJobService {
  /**
   * Khóa và lấy job tiếp theo cần xử lý (ở trạng thái pending hoặc bị kẹt lâu hơn lock TTL).
   * Sử dụng atomic `findOneAndUpdate` để tránh tranh chấp tài nguyên giữa nhiều worker.
   * @param workerId Định danh của worker đang yêu cầu lấy job.
   * @returns Job đã được khóa thành công hoặc null nếu không còn job nào.
   */
  async claimNextJob(workerId: string): Promise<DocumentExtractionJob> {
    const lockThreshold = new Date(Date.now() - EXTRACTION_JOB_LOCK_TTL_MS)

    const query = {
      $or: [
        { status: ExtractionStatus.pending },
        {
          status: ExtractionStatus.processing,
          lockedAt: { $lt: lockThreshold }
        }
      ]
    }

    const update = {
      $set: {
        status: ExtractionStatus.processing,
        lockedAt: new Date(),
        lockedBy: workerId,
        startedAt: new Date()
      },
      $inc: { attempts: 1 }
    }

    const result = await databaseService.documentExtractionJobs.findOneAndUpdate(query, update, {
      returnDocument: 'after',
      sort: { createdAt: 1 }
    })

    return result as DocumentExtractionJob
  }

  /**
   * Đánh dấu job hoàn thành và cập nhật văn bản trích xuất được vào solution.
   * Đồng thời ghi nhật ký hoạt động trích xuất thành công.
   * @param jobId ID của job cần cập nhật.
   * @param solutionId ID của solution liên kết.
   * @param extractedText Nội dung văn bản trích xuất được.
   * @param uploaderId ID của người dùng tải lên tài liệu để ghi log.
   */
  async completeJob(jobId: ObjectId, solutionId: ObjectId, extractedText: string, uploaderId: ObjectId): Promise<void> {
    const now = new Date()

    await Promise.all([
      databaseService.documentExtractionJobs.updateOne(
        { _id: jobId },
        {
          $set: {
            status: ExtractionStatus.completed,
            finishedAt: now,
            updatedAt: now
          },
          $unset: { lockedAt: '', lockedBy: '' }
        }
      ),
      databaseService.solutions.updateOne(
        { _id: solutionId },
        {
          $set: {
            extractionStatus: ExtractionStatus.completed,
            extractedText: extractedText,
            extractedAt: now,
            updatedAt: now
          }
        }
      ),
      databaseService.activityLogs.insertOne(
        new ActivityLog({
          accountId: uploaderId,
          action: ActivityAction.extractComplete,
          entityType: ActivityEntityType.solution,
          entityId: solutionId,
          metadata: {
            extractionStatus: ExtractionStatus.completed,
            extractedChars: extractedText.length
          }
        })
      )
    ])
  }

  /**
   * Đánh dấu job bị bỏ qua (ví dụ tệp hình ảnh không hỗ trợ trích xuất văn bản dạng số).
   * Đồng thời ghi nhật ký hoạt động.
   * @param jobId ID của job cần cập nhật.
   * @param solutionId ID của solution liên kết.
   * @param reason Lý do bỏ qua tác vụ trích xuất.
   * @param uploaderId ID của người dùng tải lên tài liệu để ghi log.
   */
  async skipJob(jobId: ObjectId, solutionId: ObjectId, reason: string, uploaderId: ObjectId): Promise<void> {
    const now = new Date()

    await Promise.all([
      databaseService.documentExtractionJobs.updateOne(
        { _id: jobId },
        {
          $set: {
            status: ExtractionStatus.skipped,
            finishedAt: now,
            updatedAt: now
          },
          $unset: { lockedAt: '', lockedBy: '' }
        }
      ),
      databaseService.solutions.updateOne(
        { _id: solutionId },
        {
          $set: {
            extractionStatus: ExtractionStatus.skipped,
            extractionErrorMessage: reason,
            updatedAt: now
          }
        }
      ),
      databaseService.activityLogs.insertOne(
        new ActivityLog({
          accountId: uploaderId,
          action: ActivityAction.extractSkipped,
          entityType: ActivityEntityType.solution,
          entityId: solutionId,
          metadata: {
            extractionStatus: ExtractionStatus.skipped,
            errorMessage: reason
          }
        })
      )
    ])
  }

  /**
   * Đánh dấu job thất bại. Nếu số lần thử chưa đạt tối đa, job sẽ quay về trạng thái pending để thử lại.
   * Ngược lại, job và solution sẽ bị đánh dấu thất bại vĩnh viễn và ghi nhật ký lỗi.
   * @param jobId ID của job gặp lỗi.
   * @param solutionId ID của solution liên kết.
   * @param error Lỗi phát sinh trong quá trình trích xuất.
   * @param uploaderId ID của người dùng tải lên tài liệu để ghi log.
   * @param currentAttempts Số lần thử hiện tại của job.
   * @param maxAttempts Số lần thử tối đa cho phép.
   */
  async failJob(
    jobId: ObjectId,
    solutionId: ObjectId,
    error: Error,
    uploaderId: ObjectId,
    currentAttempts: number,
    maxAttempts: number
  ): Promise<void> {
    const now = new Date()
    const isPermanentFail = currentAttempts >= maxAttempts

    if (isPermanentFail) {
      await Promise.all([
        databaseService.documentExtractionJobs.updateOne(
          { _id: jobId },
          {
            $set: {
              status: ExtractionStatus.failed,
              lastError: error.message,
              finishedAt: now,
              updatedAt: now
            },
            $unset: { lockedAt: '', lockedBy: '' }
          }
        ),
        databaseService.solutions.updateOne(
          { _id: solutionId },
          {
            $set: {
              extractionStatus: ExtractionStatus.failed,
              extractionErrorMessage: error.message,
              updatedAt: now
            }
          }
        ),
        databaseService.activityLogs.insertOne(
          new ActivityLog({
            accountId: uploaderId,
            action: ActivityAction.extractFailed,
            entityType: ActivityEntityType.solution,
            entityId: solutionId,
            metadata: {
              extractionStatus: ExtractionStatus.failed,
              errorMessage: error.message
            }
          })
        )
      ])
    } else {
      // Đưa job về pending và mở khóa để hệ thống tiến hành thử lại sau
      await databaseService.documentExtractionJobs.updateOne(
        { _id: jobId },
        {
          $set: {
            status: ExtractionStatus.pending,
            lastError: error.message,
            updatedAt: now
          },
          $unset: { lockedAt: '', lockedBy: '', startedAt: '' }
        }
      )
    }
  }
}

const documentExtractionJobService = new DocumentExtractionJobService()
export default documentExtractionJobService
