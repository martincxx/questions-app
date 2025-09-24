'use client';

import { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
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
          height: { ideal: 1080 }
        }
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

  const captureAndRecognize = async () => {
    if (!isStreaming || !videoRef.current) return;

    setLoading(true);
    setOcrText('Scanning...');
    setFoundQuestion(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const image = canvas.toDataURL('image/jpeg');

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(image, 'ru', {
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
    <main style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '24px',
        marginBottom: '20px',
        color: '#333'
      }}>Camera OCR & JSON Search</h1>
      <div className="camera-section">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="camera-feed"
          style={{
            width: '100%',
            maxWidth: '400px',
            height: 'auto',
            border: '2px solid #ccc',
            borderRadius: '8px'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="controls" style={{ 
        display: 'flex', 
        gap: '10px', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        margin: '20px 0'
      }}>
        {!isStreaming ? (
          <button 
            onClick={startCamera}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
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
                cursor: 'pointer'
              }}
            >
              Stop Camera
            </button>
            <button 
              onClick={captureAndRecognize} 
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: loading ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Scanning...' : 'Scan Photo'}
            </button>
          </>
        )}
      </div>

      <div className="results-section">
        {ocrText && (
          <div className="ocr-result">
            <h2>Scanned Text</h2>
            <p>{ocrText}</p>
          </div>
        )}

        {foundQuestion && (
          <div className="found-question">
            <h2>Found Question in JSON</h2>
            <p>
              <strong>ID:</strong> {foundQuestion.id}
            </p>
            <p>
              <strong>Question:</strong> {foundQuestion.questionText}
            </p>
            <h3>Answers:</h3>
            <ul>
              {foundQuestion.answers.map((answer) => (
                <li key={answer.id}>
                  {answer.text} {answer.isCorrect && '✅'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!foundQuestion && ocrText && !loading && (
          <p className="not-found">No matching question found.</p>
        )}
      </div>
    </main>
  );
}
