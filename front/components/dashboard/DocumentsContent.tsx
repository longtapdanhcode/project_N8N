"use client";

import { useEffect, useRef, useState } from "react";
import {
  getDocuments,
  ingestDocument,
  type KnowledgeDocument,
} from "@/lib/api";

export function DocumentsContent() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("quy_che");
  const [file, setFile] = useState<File>();
  const fileInput = useRef<HTMLInputElement>(null);
  const load = async (start: number) => {
    setLoading(true);
    setError("");
    try {
      setDocuments((await getDocuments(start)).data);
      setOffset(start);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được tài liệu.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load(0);
  }, []);
  return (
    <div className="service-page">
      <h2>Kho tài liệu học vụ</h2>
      <p>
        Tài liệu nguồn cho trợ lý hỏi đáp. Chỉ nhập văn bản hoặc tệp .txt, .md.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            if (
              file &&
              (!/\.(txt|md)$/i.test(file.name) || file.size > 5 * 1024 * 1024)
            )
              throw new Error("Chọn tệp .txt hoặc .md không quá 5 MB.");
            const result = await ingestDocument(
              { title: title.trim(), content: content.trim(), category },
              file,
            );
            if (!result.success) throw new Error("Chưa nhập được tài liệu.");
            setNotice(
              `Đã nhập tài liệu, tạo ${result.chunks_created} đoạn tra cứu.`,
            );
            setTitle("");
            setContent("");
            setFile(undefined);
            if (fileInput.current) fileInput.current.value = "";
            await load(0);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Không nhập được tài liệu.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Tiêu đề
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Nhóm tài liệu
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="quy_che">Quy chế</option>
            <option value="hoc_phan">Học phần</option>
            <option value="huong_dan">Hướng dẫn</option>
          </select>
        </label>
        <label>
          Tệp văn bản (tùy chọn)
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
        </label>
        {!file && (
          <label>
            Nội dung
            <textarea
              required
              rows={7}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
        )}
        <button disabled={busy || !title.trim() || (!file && !content.trim())}>
          {busy ? "Đang xử lý tài liệu…" : "Nhập tài liệu"}
        </button>
      </form>
      {error && (
        <p className="service-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="service-toolbar">
        <h3>Tài liệu đã nhập</h3>
        <button disabled={loading} onClick={() => void load(offset)}>
          Tải lại
        </button>
      </div>
      {loading ? (
        <div className="service-loading" role="status">
          Đang tải tài liệu…
        </div>
      ) : !documents.length ? (
        <p>Chưa có tài liệu ở trang này.</p>
      ) : (
        <div className="service-list">
          {documents.map((d) => (
            <details key={d.id}>
              <summary>{d.title}</summary>
              <p className="whitespace-pre-wrap">{d.content}</p>
              <small>
                {new Date(d.created_at).toLocaleDateString("vi-VN")}
              </small>
            </details>
          ))}
        </div>
      )}
      <div className="service-toolbar">
        <button
          disabled={!offset || loading}
          onClick={() => void load(Math.max(0, offset - 20))}
        >
          Trang trước
        </button>
        <span>Trang {offset / 20 + 1}</span>
        <button
          disabled={loading || documents.length < 20}
          onClick={() => void load(offset + 20)}
        >
          Trang sau
        </button>
      </div>
    </div>
  );
}
