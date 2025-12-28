"use client";

import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import styles from "./EventListener.module.css";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>("image/png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("준비 중...");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    } else {
      resetUI();
    }
  };

  const resetUI = () => {
    setFile(null);
    setProgress(0);
    setStatusText("준비 중...");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        if (fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(droppedFile);
            fileInputRef.current.files = dataTransfer.files;
        }
        setFile(droppedFile);
    }
  };

  const convertImageToBlob = (fileBlob: Blob, targetFormat: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if(e.target?.result) {
            img.src = e.target.result as string;
        }
      };
      reader.onerror = () => reject(new Error("파일 읽기 실패"));

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("이미지 변환 실패"));
          },
          targetFormat,
          0.8
        );
      };
      img.onerror = () => reject(new Error("이미지 로드 실패"));
      reader.readAsDataURL(fileBlob);
    });
  };

  const handleConvert = async () => {
    if (!file) {
      alert("ZIP 파일을 먼저 업로드해주세요!");
      return;
    }
    if (!file.name.endsWith(".zip") && file.type.indexOf("zip") === -1) {
      alert("유효한 ZIP 파일이 아닙니다.");
      return;
    }

    setIsProcessing(true);
    setStatusText("ZIP 파일 분석 중...");

    const targetExtension = format === "image/png" ? "png" : "webp";
    const newZip = new JSZip();
    const inputZip = new JSZip();

    try {
      const loadedZip = await inputZip.loadAsync(file);
      const filePaths = Object.keys(loadedZip.files).filter(
        (path) => !loadedZip.files[path].dir
      );

      if (filePaths.length === 0) {
        throw new Error("ZIP 파일 내에 처리할 파일이 없습니다.");
      }

      let processedCount = 0;

      for (const filePath of filePaths) {
        const zipEntry = loadedZip.files[filePath];

        if (filePath.startsWith("__") || filePath.includes("/.")) {
          continue;
        }

        try {
          const originalBlob = await zipEntry.async("blob");
          const convertedBlob = await convertImageToBlob(originalBlob, format);

          const lastDotIndex = filePath.lastIndexOf(".");
          const basePath =
            lastDotIndex !== -1 ? filePath.substring(0, lastDotIndex) : filePath;
          const newFileName = `${basePath}.${targetExtension}`;

          newZip.file(newFileName, convertedBlob);
        } catch (err) {
          console.warn(`${filePath} 변환 실패:`, err);
        }

        processedCount++;
        const percent = Math.round((processedCount / filePaths.length) * 100);
        setStatusText(`변환 진행 중... (${processedCount}/${filePaths.length})`);
        setProgress(percent);

        await new Promise((r) => setTimeout(r, 0)); 
      }

      setStatusText("결과물 압축 중...");
      const content = await newZip.generateAsync({ type: "blob" });
      saveAs(content, "converted_images.zip");

      alert("모든 작업이 완료되었습니다!");
    } catch (error: any) {
      console.error("오류:", error);
      alert("오류 발생: " + error.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
      }, 2000);
    }
  };

  // [수정] 동적 클래스 적용 부분 (새로운 카멜케이스 클래스명 사용)
  const dropZoneClasses = `
    ${styles.dropZone} 
    ${file ? styles.fileSelected : ""} 
    ${isDragOver ? styles.dragOver : ""}
  `.trim();

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* [수정] 태그 대신 클래스 적용 */}
        <h1 className={styles.title}>이미지 포맷 변환기</h1>
        <p className={styles.subtitle}>ZIP 업로드 → 변환 → ZIP 다운로드</p>

        {/* 옵션 선택 */}
        {/* [수정] styles.controlGroup 사용 */}
        <div className={styles.controlGroup}>
          {/* [수정] styles.label 사용 */}
          <label htmlFor="formatSelect" className={styles.label}>변환할 포맷</label>
          {/* [수정] styles.selectInput 사용 */}
          <select
            id="formatSelect"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            disabled={isProcessing}
            className={styles.selectInput}
          >
            <option value="image/png">PNG로 변환 (WebP → PNG)</option>
            <option value="image/webp">WebP로 변환 (PNG → WebP)</option>
          </select>
        </div>

        {/* 드롭 존 */}
        <div
          id="dropZone"
          className={dropZoneClasses}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="fileInput"
            accept=".zip, application/zip, application/x-zip-compressed"
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={isProcessing}
            className={styles.hiddenInput} /* [수정] input에도 클래스 적용 */
          />
          
          {!file ? (
            <div className="drop-message">
              <div className={styles.icon}>📦</div>
              {/* [수정] 글자색 적용된 dropMessageText 클래스 사용 */}
              <p className={styles.dropMessageText}>
                변환할 이미지가 담긴 <strong>ZIP 파일</strong>을 드래그하세요
              </p>
              {/* [수정] styles.smallText 사용 */}
              <span className={styles.smallText}>압축을 풀지 않고 바로 변환해 드립니다.</span>
            </div>
          ) : (
            <div className="drop-message">
              <div className={styles.icon}>✅</div>
              {/* [수정] styles.fileInfo 사용 */}
              <div className={styles.fileInfo}>{file.name}</div>
              {/* [수정] styles.successMsg 사용 */}
              <span className={styles.successMsg}>
                파일이 준비되었습니다. 변환 버튼을 눌러주세요.
              </span>
            </div>
          )}
        </div>

        {/* 진행 상태바 */}
        {(isProcessing || progress > 0) && (
          // [수정] styles.statusArea 사용
          <div id="statusArea" className={styles.statusArea}>
            <p className={styles.statusText}>{statusText}</p>
            {/* [수정] styles.progressContainer 사용 */}
            <div className={styles.progressContainer}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 버튼 그룹 */}
        {/* [수정] styles.buttonGroup 사용 */}
        <div className={styles.buttonGroup}>
          <button
            id="resetBtn"
            className={styles.btnSecondary}
            onClick={resetUI}
            disabled={isProcessing}
          >
            초기화
          </button>
          <button
            id="convertBtn"
            className={styles.btnPrimary}
            onClick={handleConvert}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "변환 시작 및 다운로드"}
          </button>
        </div>
      </div>
    </div>
  );
}