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
          height: { ideal: 400 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Error: Could not access the camera. Please check permissions.');
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
      const {
        data: { text },
      } = await Tesseract.recognize(capturedPhoto, 'rus', {
        logger: (m) => console.log(m),
      });
      setOcrText(text);
      findQuestion(text);
    } catch (err) {
      console.error('OCR error:', err);
      setOcrText('OCR failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setOcrText('');
    setFoundQuestion(null);
    startCamera();
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
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          marginBottom: '20px',
          color: '#333',
        }}
      >
        Photo OCR Scanner
      </h1>
      <div className="camera-section">
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
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div
        className="controls"
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          margin: '20px 0',
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
              Start Camera
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
                Cancel
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
                Take Photo
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
              Retake
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
              {loading ? 'Processing...' : 'Process Photo'}
            </button>
          </>
        )}
      </div>

      {ocrText && (
        <div
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            margin: '20px 0',
            textAlign: 'left',
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>
            Detected Text
          </h3>
          <p
            style={{
              backgroundColor: 'white',
              padding: '15px',
              borderRadius: '4px',
              border: '1px solid #e9ecef',
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {ocrText}
          </p>
        </div>
      )}

      {foundQuestion && (
        <div
          style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '8px',
            padding: '20px',
            margin: '20px 0',
            textAlign: 'left',
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
            ✅ Question Found
          </h3>
          <p>
            <strong>ID:</strong> {foundQuestion.id}
          </p>
          <p>
            <strong>Question:</strong> {foundQuestion.questionText}
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
      )}

      {!foundQuestion && ocrText && !loading && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            padding: '20px',
            margin: '20px 0',
          }}
        >
          <p style={{ margin: 0, color: '#721c24' }}>
            ❌ No matching question found in database.
          </p>
        </div>
      )}
    </main>
  );
}
