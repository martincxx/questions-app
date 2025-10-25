'use client';

import { useState, useRef, useEffect } from 'react';
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
      // Create cropped image from Focus Area
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

  const findQuestion = (scannedText) => {
    const normalizedText = scannedText
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    const matched = questionsData.find((q) =>
      normalizedText.includes(q.questionText.toLowerCase().trim())
    );
    setFoundQuestion(matched || null);
  };

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <h1
        style={{
          fontSize: '20px',
          margin: '10px 0',
          color: '#333',
          flexShrink: 0,
        }}
      >
        Фото OCR-сканер - версия 0.0.1 [старые вопросы]
      </h1>
      <div style={{ flex: '0 0 auto', marginBottom: '10px' }}>
        {!capturedPhoto ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              border: '2px solid #ccc',
              borderRadius: '8px',
            }}
          />
        ) : (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={capturedPhoto}
              alt="Captured photo"
              style={{
                width: '100%',
                maxWidth: '400px',
                height: 'auto',
                border: '2px solid #28a745',
                borderRadius: '8px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: focusArea.x,
                top: focusArea.y,
                width: focusArea.width,
                height: focusArea.height,
                border: '3px solid #007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderRadius: '6px',
                touchAction: 'none',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-25px',
                  left: '0',
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '2px 6px',
                  fontSize: '12px',
                  borderRadius: '3px',
                }}
              >
                Активная зона
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          margin: '10px 0',
          flexShrink: 0,
        }}
      >
        {!capturedPhoto ? (
          !isStreaming ? (
            <button
              onClick={startCamera}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Запустить приложение
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={takePhoto}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Сделать фото
              </button>
            </>
          )
        ) : (
          <>
            <button
              onClick={retakePhoto}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Повторить
            </button>
            <button
              onClick={processPhoto}
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: loading ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Обработка...' : 'Процесс'}
            </button>
          </>
        )}
      </div>

      {showPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <button
              onClick={closePopup}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              ×
            </button>

            {ocrText && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
                  Текст, найденный на изображении:
                </h3>
                <p
                  style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                  }}
                >
                  {ocrText}
                </p>
              </div>
            )}

            {foundQuestion ? (
              <div
                style={{
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '8px',
                  padding: '15px',
                }}
              >
                <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
                  ✅ Вопрос найден!
                </h3>
                <p style={{ margin: '5px 0' }}>
                  <strong>ID:</strong> {foundQuestion.id}
                </p>
                <p style={{ margin: '5px 0' }}>
                  <strong>Вопрос:</strong> {foundQuestion.questionText}
                </p>
                <h4 style={{ margin: '15px 0 10px 0' }}>Answers:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {foundQuestion.answers.map((answer) => (
                    <li key={answer.id} style={{ margin: '5px 0' }}>
                      {answer.text} {answer.isCorrect && '✅'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              ocrText && (
                <div
                  style={{
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '8px',
                    padding: '15px',
                  }}
                >
                  <p style={{ margin: 0, color: '#721c24' }}>
                    ❌ Соответствующий вопрос в базе данных не найден.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </main>
  );
}
