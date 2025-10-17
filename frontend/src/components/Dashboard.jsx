import { useNavigate, Link } from 'react-router-dom';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const webcamCanvasRef = useRef(null);
  const imageCanvasRef = useRef(null);
  const imageRef = useRef(null);

  const [faceCount, setFaceCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [history, setHistory] = useState([]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('✅ Models loaded from local');
      } catch (err) {
        const CDN_URL =
          'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
        await faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL);
        console.log('✅ Models loaded from CDN');
      }
    };
    loadModels();
  }, []);

  // Face detection
  const detectFaces = async (base64Image, canvasRef, imageElement, sourceType) => {
    setLoading(true);
    const img = new Image();
    img.src = base64Image;

    img.onload = async () => {
      try {
        const detections = await faceapi.detectAllFaces(
          img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 })
        );

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to video or image
        if (sourceType === 'webcam' && webcamRef.current?.video) {
          canvas.width = webcamRef.current.video.videoWidth;
          canvas.height = webcamRef.current.video.videoHeight;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Resize detections for webcam
        const detectionsResized =
          sourceType === 'webcam'
            ? faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height })
            : detections;

        // Draw detection boxes
        detectionsResized.forEach((det) => {
          const { x, y, width, height } = det.box;

          ctx.beginPath();
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(34,197,94,0.95)';
          ctx.rect(x, y, width, height);
          ctx.stroke();

          ctx.fillStyle = 'rgba(34,197,94,0.25)';
          ctx.fillRect(x, y, width, height);

          const label = `Face ${(det.score * 100).toFixed(1)}%`;
          ctx.font = '14px Poppins, Arial';
          const textWidth = ctx.measureText(label).width + 6;
          const textHeight = 18;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, y - textHeight, textWidth, textHeight);
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x + 3, y - 4);
        });

        setFaceCount(detections.length);

        // Save detection to history
        setHistory((prev) => [
          {
            id: Date.now(),
            type: sourceType,
            image: base64Image,
            faces: detections.length,
            time: new Date().toLocaleString(),
          },
          ...prev,
        ]);
      } catch (err) {
        console.error('❌ Detection Error:', err);
        setFaceCount(0);
      } finally {
        setLoading(false);
      }
    };
  };

  // Capture from webcam
  const captureFromWebcam = useCallback(async () => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    const video = webcamRef.current.video;

    // Wait for video to load
    if (video.readyState !== 4) {
      await new Promise((res) =>
        video.addEventListener('loadeddata', res, { once: true })
      );
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) detectFaces(imageSrc, webcamCanvasRef, null, 'webcam');
  }, []);

  // Upload & detect
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadedImageDetect = () => {
    if (uploadedImage && imageRef.current) {
      detectFaces(uploadedImage, imageCanvasRef, imageRef.current, 'upload');
    }
  };

  // Delete & clear history
  const deleteHistoryItem = (id) => setHistory((prev) => prev.filter((item) => item.id !== id));
  const clearHistory = () => setHistory([]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-200 via-pink-200 to-indigo-200 animate-gradientBG">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center sticky top-0 z-10 rounded-b-xl">
        <div className="text-2xl font-extrabold text-gray-800">Smart Vision</div>
        <div className="space-x-3">
          <Link to="/login">
            <button className="px-4 py-2 text-gray-700 border border-gray-700 rounded hover:bg-gray-700 hover:text-white transition">
              Login
            </button>
          </Link>
          <Link to="/register">
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
              Register
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Section */}
      <div className="flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
          {/* Webcam Detection */}
          <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl transition">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Webcam Detection</h2>
            <div className="relative rounded overflow-hidden border border-gray-200">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="rounded-lg"
              />
              <canvas
                ref={webcamCanvasRef}
                className="absolute top-0 left-0 pointer-events-none w-full h-full"
              />
            </div>
            <button
              onClick={captureFromWebcam}
              className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              disabled={loading}
            >
              {loading ? 'Detecting...' : 'Detect Face'}
            </button>
          </div>

          {/* Upload Image Detection */}
          <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col items-center hover:shadow-2xl transition">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Upload Image</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mb-4 rounded border border-gray-300 p-2 w-full text-gray-600"
            />
            {imagePreview && (
              <div className="relative w-full flex justify-center mb-3">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Uploaded Preview"
                  className="w-64 h-auto rounded-lg shadow-md"
                />
                <canvas
                  ref={imageCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none w-64 h-auto"
                />
              </div>
            )}
            {/* <button
              onClick={handleUploadedImageDetect}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              disabled={!uploadedImage || loading}
            >
              {loading ? 'Detecting...' : 'Detect Face'}
            </button> */}
          </div>
        </div>

        {/* Result
        {faceCount !== null && (
          <div className="mt-6 text-lg font-semibold text-gray-800 bg-white px-6 py-3 rounded-2xl shadow-md">
            Faces Detected: {faceCount}
          </div>
        )} */}

        {/* Detection History */}
        <div className="mt-10 w-full max-w-5xl bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Detection History</h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Clear All
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-gray-500 text-center">No history yet. Detect some faces!</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 shadow hover:shadow-md transition relative"
                >
                  <img
                    src={item.image}
                    alt="Detected"
                    className="rounded-lg w-full h-40 object-cover"
                  />
                  <div className="mt-2 text-sm text-gray-700">
                    
                    <p><b>Source:</b> {item.type}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gradient Animation */}
      <style>
        {`
          @keyframes gradientBG {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradientBG {
            background-size: 300% 300%;
            animation: gradientBG 15s ease infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;
