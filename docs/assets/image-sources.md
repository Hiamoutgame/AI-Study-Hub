# Image Sources

File này ghi lại các nguồn ảnh web được nhúng trong `docs/endpoint-flows/`. Ảnh web chỉ dùng để minh hoạ concept tổng quan; flow thật của project nằm trong Mermaid diagram và text flow của từng file.

## Mermaid References

| Mục                             | Source                                                                                                      | Cách dùng                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| GitHub Mermaid rendering        | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams | Chứng minh Markdown trên GitHub có thể render Mermaid diagram. |
| Mermaid sequence diagram syntax | https://mermaid.js.org/syntax/sequenceDiagram.html                                                          | Dùng để viết `sequenceDiagram` cho flow request.               |

## Web Images

| Ảnh                        | Embed URL                                                                            | Source page                                                            | Dùng trong                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Web API diagram            | `https://commons.wikimedia.org/wiki/Special:FilePath/Web_API_diagram.svg`            | https://commons.wikimedia.org/wiki/File:Web_API_diagram.svg            | `README.md`, `01-authentication.md`, `02-user-profile-storage.md`, admin docs |
| Client-server model        | `https://commons.wikimedia.org/wiki/Special:FilePath/Client-server-model.svg`        | https://commons.wikimedia.org/wiki/File:Client-server-model.svg        | Các flow REST/client-server tổng quan                                         |
| Cloud storage architecture | `https://commons.wikimedia.org/wiki/Special:FilePath/Cloud_storage_architecture.png` | https://commons.wikimedia.org/wiki/File:Cloud_storage_architecture.png | Document upload, cloud preview, storage quota                                 |
| Full GPT architecture      | `https://commons.wikimedia.org/wiki/Special:FilePath/Full_GPT_architecture.svg`      | https://commons.wikimedia.org/wiki/File:Full_GPT_architecture.svg      | AI chat, AI summarize/explain, AI settings                                    |

## Quy Ước Khi Thêm Ảnh Mới

- Ưu tiên Wikimedia Commons hoặc official docs.
- Không hotlink ảnh blog/stock không rõ license.
- Mỗi ảnh trong file `.md` phải có dòng `Nguồn:` ngay bên dưới.
- Nếu ảnh chỉ minh hoạ concept chung, phải nói rõ không phải architecture chính xác của AI Study Hub.
