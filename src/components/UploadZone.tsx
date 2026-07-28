import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, Sparkles, AlertCircle, X, ChevronRight, Edit2, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Invoice, InvoiceItem } from "../types";
import { compressImage } from "../utils/imageCompressor";

interface UploadZoneProps {
  onInvoiceAdded: (invoice: Invoice) => void;
}

export default function UploadZone({ onInvoiceAdded }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Confirmation & Edit modal state
  const [stagedInvoice, setStagedInvoice] = useState<Omit<Invoice, "id" | "createdAt" | "imageUrl"> | null>(null);
  const [stagedImage, setStagedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Process selected file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Process dropped file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Пожалуйста, загрузите файл изображения (PNG, JPG, WebP).");
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 1024, 0.7);
      const base64String = compressedDataUrl.split(",")[1];
      analyzeImage(base64String, "image/jpeg", compressedDataUrl);
    } catch (err) {
      console.error(err);
      setErrorMsg("Ошибка при обработке файла изображения.");
    }
  };

  // Camera handlers
  const startCamera = async () => {
    setErrorMsg(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMsg("Не удалось получить доступ к камере. Убедитесь, что дано разрешение.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        const base64String = dataUrl.split(",")[1];
        
        stopCamera();
        analyzeImage(base64String, "image/jpeg", dataUrl);
      }
    }
  };

  // Call API server route
  const analyzeImage = async (base64Data: string, mimeType: string, fullDataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisProgress("Загрузка снимка...");

    const steps = [
      "Распознавание текста с фото...",
      "Идентификация поставщика и даты...",
      "Разделение позиций на товары и услуги...",
      "Расчет сумм и сопоставление данных...",
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnalysisProgress(steps[currentStep]);
        currentStep++;
      }
    }, 1500);

    try {
      const response = await fetch("/api/analyze-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data, mimeType }),
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (data.success && data.invoice) {
        setStagedInvoice(data.invoice);
        setStagedImage(fullDataUrl);
      } else {
        setErrorMsg(data.error || "Не удалось распознать счет-фактуру. Попробуйте еще раз.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setErrorMsg("Ошибка подключения к серверу анализа. Попробуйте снова.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Confirmation Modal management
  const handleConfirmSave = () => {
    if (!stagedInvoice) return;

    // Generate unique IDs for invoice and each item
    const finalInvoice: Invoice = {
      ...stagedInvoice,
      id: "inv-" + Date.now(),
      createdAt: new Date().toISOString(),
      imageUrl: stagedImage || undefined,
      items: stagedInvoice.items.map((item, index) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
      })),
    };

    onInvoiceAdded(finalInvoice);
    setStagedInvoice(null);
    setStagedImage(null);
  };

  // Helper to update field in staged invoice
  const updateInvoiceField = (field: keyof Omit<Invoice, "items">, value: any) => {
    if (!stagedInvoice) return;
    setStagedInvoice({
      ...stagedInvoice,
      [field]: value,
    });
  };

  // Update item field and recalculate line sum
  const updateItemField = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!stagedInvoice) return;
    const updatedItems = [...stagedInvoice.items];
    const item = { ...updatedItems[index], [field]: value };

    // Automatically recalculate line sum if unitPrice or quantity changes
    if (field === "unitPrice" || field === "quantity") {
      item.totalPrice = Number(item.unitPrice || 0) * Number(item.quantity || 1);
    }
    updatedItems[index] = item;

    // Recalculate total amount
    const totalAmount = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);

    setStagedInvoice({
      ...stagedInvoice,
      items: updatedItems,
      totalAmount,
    });
  };

  // Toggle item type (goods <-> service)
  const toggleItemType = (index: number) => {
    if (!stagedInvoice) return;
    const currentType = stagedInvoice.items[index].type;
    const newType = currentType === "goods" ? "service" : "goods";
    updateItemField(index, "type", newType);
  };

  // Remove item from staged invoice
  const removeStagedItem = (index: number) => {
    if (!stagedInvoice) return;
    const updatedItems = stagedInvoice.items.filter((_, i) => i !== index);
    const totalAmount = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
    setStagedInvoice({
      ...stagedInvoice,
      items: updatedItems,
      totalAmount,
    });
  };

  // Add empty item to staged invoice
  const addStagedItem = () => {
    if (!stagedInvoice) return;
    const newItem: InvoiceItem = {
      id: `new-${Date.now()}`,
      description: "Новая позиция",
      type: "goods",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setStagedInvoice({
      ...stagedInvoice,
      items: [...stagedInvoice.items, newItem],
    });
  };

  return (
    <div className="w-full" id="upload-module-container">
      {/* Primary drag and drop area */}
      <div
        id="dropzone-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full rounded-2xl border-2 border-dashed p-8 md:p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center
          ${
            isDragActive
              ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 scale-[1.01]"
              : "border-slate-300 hover:border-slate-400 bg-white dark:bg-slate-900/40 dark:border-slate-700 hover:bg-slate-50/50"
          }
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          id="invoice-file-input"
        />

        {/* Outer ambient sparkle glow for AI presence */}
        <div className="absolute top-4 right-4 text-emerald-500 flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-full text-xs font-semibold shadow-xs border border-emerald-100/50 dark:border-emerald-900/20">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Gemini AI распознавание</span>
        </div>

        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-4 transition-transform group-hover:scale-110">
          <Upload className="w-7 h-7" />
        </div>

        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Перетащите фото счета-фактуры сюда
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5">
          Поддерживаются форматы JPG, PNG, WebP. Система автоматически распределит товары и услуги.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            id="btn-select-file"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            Выбрать файл
          </button>
          <button
            type="button"
            id="btn-use-camera"
            onClick={startCamera}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            Сделать фото
          </button>
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Overlay / Progress scanning */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            id="scanning-loading-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                {/* Rotating ring */}
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-950/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
                {/* Embedded Sparkles */}
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ИИ анализирует счет-фактуру</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Это займет всего несколько секунд</p>

              {/* Step indicator */}
              <div className="mt-6 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-medium inline-flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>{analysisProgress}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Web Camera Stream Capture modal */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col justify-between p-4 md:p-6" id="camera-modal">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold">Съемка счета-фактуры</span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-auto max-w-2xl mx-auto w-full aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Overlay guides for document scanning */}
              <div className="absolute inset-6 border-2 border-dashed border-emerald-500/50 rounded-lg pointer-events-none flex flex-col justify-between p-4">
                <div className="w-full text-center text-xs text-emerald-400/90 font-medium bg-slate-950/40 py-1 rounded-sm">
                  Поместите документ в эту рамку
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 py-4 max-w-md mx-auto w-full">
              <button
                type="button"
                onClick={stopCamera}
                className="px-5 py-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-8 py-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                Сделать снимок
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Structured Confirmation & Verification Modal */}
      <AnimatePresence>
        {stagedInvoice && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="confirm-staged-invoice-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Проверка данных ИИ</h3>
                    <p className="text-xs text-slate-500">Проверьте корректность перед сохранением в систему</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStagedInvoice(null);
                    setStagedImage(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left side: Invoice Image Preview */}
                <div className="lg:col-span-4 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Фото документа</span>
                  <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-950/40 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
                    {stagedImage ? (
                      <img src={stagedImage} alt="Scanned Invoice" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Нет изображения
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Scanned fields editors */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Основная информация</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Поставщик</label>
                      <input
                        type="text"
                        value={stagedInvoice.supplierName}
                        onChange={(e) => updateInvoiceField("supplierName", e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Номер счета-фактуры</label>
                      <input
                        type="text"
                        value={stagedInvoice.invoiceNumber}
                        onChange={(e) => updateInvoiceField("invoiceNumber", e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Дата выставления</label>
                      <input
                        type="date"
                        value={stagedInvoice.date}
                        onChange={(e) => updateInvoiceField("date", e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Items list with goods/services indicator */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Позиции в документе</span>
                    <button
                      type="button"
                      onClick={addStagedItem}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      + Добавить позицию
                    </button>
                  </div>

                  <div className="border rounded-xl overflow-hidden border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 border-b dark:border-slate-800 font-semibold">
                        <tr>
                          <th className="p-3 w-7/12">Наименование</th>
                          <th className="p-3 w-2/12 text-center">Тип</th>
                          <th className="p-3 w-1/12 text-center">Кол-во</th>
                          <th className="p-3 w-2/12 text-right">Цена</th>
                          <th className="p-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {stagedInvoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItemField(idx, "description", e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none p-0 text-slate-800 dark:text-slate-200"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => toggleItemType(idx)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider select-none transition-all ${
                                  item.type === "goods"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                }`}
                              >
                                {item.type === "goods" ? "Товар" : "Услуга"}
                              </button>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemField(idx, "quantity", Number(e.target.value))}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-emerald-500 focus:outline-none p-0 text-center text-slate-800 dark:text-slate-200"
                              />
                            </td>
                            <td className="p-3 text-right font-medium">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItemField(idx, "unitPrice", Number(e.target.value))}
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-emerald-500 focus:outline-none p-0 text-right text-slate-800 dark:text-slate-200"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeStagedItem(idx)}
                                className="text-red-500 hover:text-red-700 font-semibold p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculated total amount bar */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Общая сумма по строкам</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(stagedInvoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStagedInvoice(null);
                    setStagedImage(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-6 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Учесть документ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
