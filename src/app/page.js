'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Tesseract from 'tesseract.js';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundQuestion, setFoundQuestion] = useState(null);
  const [questionsData, setQuestionsData] = useState([]);
  const [focusArea, setFocusArea] = useState({
    x: 0,
    y: 0,
    width: 400,
    height: 120,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Fetch JSON data on component mount
    fetch('/questions.json')
      .then((res) => res.json())
      .then((data) => setQuestionsData(data.questions))
      .catch((err) => console.error('Failed to fetch questions.json:', err));
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Ошибка доступа к фотокамере:', err);
      alert(
        'Ошибка: Не удалось получить доступ к камере. Проверьте разрешения приложения.'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  const takePhoto = () => {
    if (!isStreaming || !videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(photoDataUrl);
    stopCamera();
  };

  const processPhoto = async () => {
    if (!capturedPhoto) return;

    setLoading(true);
    setOcrText('');
    setFoundQuestion(null);

    try {
      // Create cropped image from focus area
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scaleX = img.width / 400; // Assuming max display width is 400px
        const scaleY = img.height / ((img.height * 400) / img.width);

        canvas.width = focusArea.width * scaleX;
        canvas.height = focusArea.height * scaleY;

        ctx.drawImage(
          img,
          focusArea.x * scaleX,
          focusArea.y * scaleY,
          focusArea.width * scaleX,
          focusArea.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const croppedImage = canvas.toDataURL('image/jpeg');

        const {
          data: { text },
        } = await Tesseract.recognize(croppedImage, 'rus', {
          logger: (m) => console.log(m),
        });

        setOcrText(text);
        findQuestion(text);
        setLoading(false);
        setShowPopup(true);
      };
      img.src = capturedPhoto;
    } catch (err) {
      console.error('Ошибка OCR:', err);
      setOcrText('Ошибка распознавания текста. Попробуйте ещё раз.');
      setLoading(false);
      setShowPopup(true);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setOcrText('');
    setFoundQuestion(null);
    setFocusArea({ x: 0, y: 0, width: 400, height: 120 });
    setShowPopup(false);
    startCamera();
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = touch.clientX - rect.left - focusArea.width / 2;
    const y = touch.clientY - rect.top - focusArea.height / 2;
    setFocusArea((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(x, rect.width - prev.width)),
      y: Math.max(0, Math.min(y, rect.height - prev.height)),
    }));
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect =
      e.currentTarget.parentElement.parentElement.getBoundingClientRect();
    const newHeight = Math.max(
      40,
      Math.min(200, touch.clientY - rect.top - focusArea.y)
    );
    setFocusArea((prev) => ({ ...prev, height: newHeight }));
  };

  const handleResizeEnd = (e) => {
    e.preventDefault();
    setIsResizing(false);
  };

  const findQuestion = (scannedText) => {
    const normalizedText = scannedText
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const matched = questionsData.find((q) =>
      normalizedText.includes(q.questionText)
    );
    setFoundQuestion(matched || null);
  };

  return (
    <main className="mobile-container">
      <h1 className="mobile-title">Фото OCR-сканер</h1>

      <div className="camera-container">
        {!capturedPhoto ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="camera-video"
          />
        ) : (
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              width: '100%',
            }}
          >
            <Image
              src={capturedPhoto}
              alt="Captured photo"
              className="camera-image"
              width={400}
              height={300}
              unoptimized
            />
            <div
              className="focus-overlay"
              style={{
                left: focusArea.x,
                top: focusArea.y,
                width: focusArea.width,
                height: focusArea.height,
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="focus-label">Активная зона</div>
              <div
                className="resize-handle"
                onTouchStart={handleResizeStart}
                onTouchMove={handleResizeMove}
                onTouchEnd={handleResizeEnd}
              ></div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="mobile-controls">
        {!capturedPhoto ? (
          !isStreaming ? (
            <button onClick={startCamera} className="mobile-button btn-primary">
              Запустить приложение
            </button>
          ) : (
            <>
              <button onClick={stopCamera} className="mobile-button btn-danger">
                Отмена
              </button>
              <button onClick={takePhoto} className="mobile-button btn-success">
                Сделать фото
              </button>
            </>
          )
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="mobile-button"
              style={{ backgroundColor: '#6c757d' }}
            >
              Повторить
            </button>
            <button
              onClick={processPhoto}
              disabled={loading}
              className="mobile-button btn-primary"
              style={{
                backgroundColor: loading ? '#ccc' : undefined,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <span className="loading-spinner"></span>}
              {loading ? 'Обработка...' : 'Процесс'}
            </button>
          </>
        )}
      </div>

      {showPopup && (
        <div className="mobile-popup">
          <div className="popup-content">
            <button onClick={closePopup} className="popup-close">
              ×
            </button>
            <div className="results-content">
              {ocrText && (
                <div className="result-section">
                  <h3 className="result-title">
                    Текст, найденный на изображении:
                  </h3>
                  <p className="result-text">{ocrText}</p>
                </div>
              )}
              {foundQuestion ? (
                <div className="result-section question-found">
                  <h3 className="result-title">✅ Вопрос найден!</h3>
                  <p className="result-text" style={{ marginBottom: '5px' }}>
                    <strong>ID:</strong> {foundQuestion.id}
                  </p>
                  <p className="result-text" style={{ marginBottom: '10px' }}>
                    <strong>Вопрос:</strong> {foundQuestion.questionText}
                  </p>
                  <h4 style={{ margin: '10px 0 5px 0', fontSize: '14px' }}>
                    Answers:
                  </h4>
                  <ul
                    style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}
                  >
                    {foundQuestion.answers.map((answer) => (
                      <li key={answer.id} style={{ margin: '3px 0' }}>
                        {answer.text} {answer.isCorrect && '✅'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                ocrText && (
                  <div className="result-section question-not-found">
                    <h3 className="result-title">
                      ❌ Соответствующий вопрос в базе данных не найден.
                    </h3>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
