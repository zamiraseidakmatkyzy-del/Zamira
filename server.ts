import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import dns from "dns";

// Prioritize IPv4 over IPv6 to resolve "fetch failed" transient network errors in containerized/sandboxed environments
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parser with increased limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization of Gemini SDK
let ai: GoogleGenAI | null = null;
const quotaExhaustedModels = new Map<string, number>();

function getGenAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// Robust content generation with fallback models and exponential backoff retry mechanism
async function generateWithFallbackAndRetry(
  aiInstance: GoogleGenAI,
  cleanMimeType: string,
  image: string,
  systemPrompt: string,
  schema: any
) {
  // Ordered list of models to try.
  // 1. gemini-3.5-flash: Standard, highly intelligent, latest model.
  // 2. gemini-3.1-flash-lite: Fast, lightweight model supporting multimodal.
  // 3. gemini-3.1-pro-preview: High-intelligence pro model (if user has paid key).
  // 4. gemini-flash-latest: Stable legacy fallback.
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-flash-latest"];
  
  // Clean up expired blockages (older than 2 minutes / 120,000ms)
  const now = Date.now();
  for (const [model, timestamp] of quotaExhaustedModels.entries()) {
    if (now - timestamp > 120000) {
      quotaExhaustedModels.delete(model);
    }
  }

  // Filter out known quota-exhausted models, but if all are exhausted, try them anyway as a last resort
  let activeModels = models.filter(m => !quotaExhaustedModels.has(m));
  if (activeModels.length === 0) {
    activeModels = [...models];
  }

  let lastError: any = null;

  for (const modelName of activeModels) {
    let delay = 1200; // Start with a more generous 1200ms delay for high-demand retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Gemini API] Attempting analysis with model ${modelName} (attempt ${attempt}/3)...`);
        const response = await aiInstance.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: image,
                },
              },
              {
                text: "Analyze the uploaded invoice image and extract all structured data accurately according to the response schema.",
              },
            ],
          },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        console.log(`[Gemini API] Successfully analyzed invoice using model ${modelName} on attempt ${attempt}!`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errStatus = Number(err.status || err.code || 0);
        const errStr = String(err.message || err || "").toLowerCase();

        // Check if this is the absolute last attempt on the last fallback model
        const isLastModel = modelName === activeModels[activeModels.length - 1];
        const isLastAttempt = attempt === 3;

        if (isLastModel && isLastAttempt) {
          console.error(`[Gemini API] Fatal error using final fallback model ${modelName} on attempt ${attempt}/3:`, err.message || err);
        } else {
          console.log(`[Gemini API] Handled transient error using model ${modelName} on attempt ${attempt}/3 (switching/retrying):`, err.message || err);
        }

        // Parse structured JSON error messages if any
        let isOverloaded = false;
        try {
          if (err && err.message && typeof err.message === "string" && err.message.trim().startsWith("{")) {
            const parsedErr = JSON.parse(err.message);
            const code = parsedErr?.error?.code || parsedErr?.code;
            const status = parsedErr?.error?.status || parsedErr?.status;
            const msg = parsedErr?.error?.message || parsedErr?.message;
            if (code === 503 || code === 429 || status === "UNAVAILABLE" || (msg && typeof msg === "string" && msg.toLowerCase().includes("high demand"))) {
              isOverloaded = true;
            }
          }
        } catch (e) {
          // ignore parsing error
        }

        if (errStatus === 503 || errStatus === 429 || errStr.includes("high demand") || errStr.includes("overloaded") || errStr.includes("503") || errStr.includes("429")) {
          isOverloaded = true;
        }

        // If it's a quota exceeded, rate limit, or high demand service overload error,
        // we should immediately switch to a fallback model instead of retrying the same model.
        const isQuotaOrOverload = isOverloaded || 
                                  errStr.includes("quota") || 
                                  errStr.includes("limit") || 
                                  errStr.includes("exhausted") || 
                                  errStr.includes("unavailable");

        if (isQuotaOrOverload) {
          console.log(`[Gemini API] Quota or High Demand error for model ${modelName}. Adding to bypass list for 2 minutes and switching to next fallback model immediately.`);
          quotaExhaustedModels.set(modelName, Date.now());
          break; // Break the attempt loop to move to the next model immediately!
        }

        // If it's a structural client error (400 Bad Request, 403 Forbidden, 404 Not Found), retrying won't help.
        // Move to the next model immediately to avoid wasting time.
        if (errStatus === 400 || errStatus === 403 || errStatus === 404 || errStr.includes("400") || errStr.includes("403") || errStr.includes("404")) {
          console.log(`[Gemini API] Fatal client error (${errStatus || "unauthorized/not found"}) for model ${modelName}. Switching models immediately.`);
          break; // Break attempt loop to proceed to next model
        }

        // For other transient errors (like network drop/connection reset),
        // we wait with exponential backoff and retry the current model.
        if (attempt < 3) {
          console.log(`[Gemini API] Retrying model ${modelName} in ${delay}ms due to transient error...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2.0; // Exponential backoff scaling
        }
      }
    }
  }
  throw lastError || new Error("Failed to extract invoice data after trying all models and attempts.");
}

// Extract and translate Gemini API raw JSON error messages to beautiful, human-readable text
function cleanErrorMessage(err: any): string {
  if (!err) return "Неизвестная ошибка";
  
  let msg = "Неизвестная ошибка";
  if (err && typeof err.message === "string") {
    msg = err.message;
  } else if (err) {
    msg = String(err.message || err);
  }
  
  // Try to parse if it is a JSON string from Gemini API
  try {
    const trimmed = msg.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      if (parsed?.error?.message && typeof parsed.error.message === "string") {
        msg = parsed.error.message;
      }
    }
  } catch (e) {
    // ignore
  }

  // Map common English messages to friendly descriptions
  const msgLower = msg.toLowerCase();
  if (msgLower.includes("quota exceeded") || msgLower.includes("resource_exhausted") || msgLower.includes("rate limit") || msgLower.includes("429")) {
    return "Превышена квота запросов к ИИ (429 Quota Exceeded). Пожалуйста, подождите немного и повторите попытку или введите данные вручную.";
  }
  if (msgLower.includes("experiencing high demand") || msgLower.includes("overloaded") || msgLower.includes("unavailable") || msgLower.includes("503")) {
    return "Сервер ИИ временно перегружен запросами (503 Service Unavailable). Пожалуйста, подождите немного и повторите попытку.";
  }
  if (msgLower.includes("api key") || msgLower.includes("key is not configured") || msgLower.includes("403") || msgLower.includes("forbidden")) {
    return "Ошибка авторизации (403 Forbidden): неверный или ненастроенный ключ API в настройках проекта.";
  }
  
  return msg;
}

// API endpoint for invoice OCR & Analysis
app.post("/api/analyze-invoice", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ success: false, error: "Missing image or mimeType" });
    }

    // Standardize & clean mimeType to avoid API failures
    let cleanMimeType = mimeType.trim().toLowerCase();
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!supportedTypes.includes(cleanMimeType)) {
      cleanMimeType = "image/jpeg";
    }

    let aiInstance;
    try {
      aiInstance = getGenAI();
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }

    const systemPrompt = `You are an expert financial assistant specialized in parsing invoices, receipts, and mobile payment transfer screenshots (such as Zelle, Venmo, Cash App, PayPal, bank mobile app transfer confirmations, wire transfers, Russian "счет-фактура", "товарная накладная", or "УПД").
Your goal is to extract structured details with high precision.
For each item, determine whether it is "goods" (material items, products, equipment - "товары") or "service" (work, services, delivery, rent, consulting, transfers, fees - "услуги").

Special Guidelines for Mobile Transfers & Payment Screens (Zelle, Venmo, Cash App, PayPal, Bank Transfers):
1. supplierName: Extract the recipient name (for expenses) or sender name (for incomes) / transfer partner name. Include the platform name for context, e.g., "Zelle - John Doe" or "Venmo - Alice Smith".
2. invoiceNumber: Extract the Transaction ID, Confirmation Code, Reference Number, or Sequence Number. If not visible, generate one based on the platform and timestamp, e.g. "ZELLE-9831" or "VENMO-CONFIRM".
3. date: Extract the transaction date and format as "YYYY-MM-DD" (e.g. "2026-07-08"). If not found, use the current date.
4. totalAmount: Extract the transferred amount.
5. currency: Default to "USD" if it's Zelle, Venmo, Cash App, unless another currency symbol (e.g., €, ₽, ₸) is explicitly shown.
6. items: Create a single descriptive line item representing the transfer:
   - description: e.g. "Zelle Transfer to [Recipient]" or "Venmo Payment to [Recipient]" or "Cash App Transfer".
   - type: "service".
   - quantity: 1.
   - unitPrice: the total amount.
   - totalPrice: the total amount.
   - expenseCategory: choose from standard tax/expense categories based on notes or recipient name, or fallback to "other".

Rules for standard invoice/receipt extraction:
1. supplierName: Extract the vendor/seller name (Поставщик, Исполнитель, Продавец).
2. invoiceNumber: Extract the document number (Номер счета, Номер счет-фактуры, Номер УПД).
3. date: Format the date strictly as "YYYY-MM-DD" (e.g. "2026-07-08"). If only year/month is present, estimate or format it. If not found, use current date.
4. totalAmount: Extract the grand total sum of the invoice (Итого к оплате, Всего, Сумма с НДС).
5. objectName: Extract any object name, project name, delivery site, or construction site mentioned on the invoice (e.g., "Объект: ул. Пушкина 10" -> "ул. Пушкина 10"). If not present, do not return it or leave it blank.
6. currency: Extract the currency of the invoice. This MUST be the currency used in the invoice, such as "USD" (or "$"), "RUB" (or "₽"), "EUR" (or "€"), "KZT" (or "₸"), etc. Look carefully at currency symbols ($, €, ₽, ₸) or words (USD, Dollars, EUR, Euro, рублей, руб, тенге, тг) next to prices or the grand total. If no currency symbol or code is found, do NOT default to RUB unless the document explicitly shows Russian Rubles symbols or text. If it is in English or has no obvious indicators, default to "USD".
7. items: Find the list of table items (items / services / goods list):
   - description: Original name of the item.
   - type: MUST be either "goods" or "service". "goods" if it represents physical products/goods. "service" if it represents transport, installation, consultation, rent, labor, or services.
   - quantity: Quantity of items (defaults to 1 if not readable).
   - unitPrice: Price per unit.
   - totalPrice: Total price for that line.
   - objectName: Optional object/project name specifically associated with this single line item or row (if noted in the row or section). Otherwise, omit or leave blank.
   - expenseCategory: Classify this item into one of these specific tax/expense categories based on description:
     * "materials" (material goods, concrete, sand, bricks, lumber, piping, equipment purchased, parts, tools)
     * "labor" (labor costs, installation work, wages, manual labor, worker hours, welding, masonry, plastering)
     * "equipment_rental" (machinery rental, excavator rent, cranes, scaffolding, power tool rentals)
     * "fuel" (petrol, diesel, gasoline, motor oils, heating oil, lubricants)
     * "permit" (state/city building permits, licenses, approvals, state register fees, stamp duties)
     * "office_expenses" (paper, printers, pens, office rent, stationery, broadband/telephony)
     * "insurance" (general liability, property insurance, vehicle insurance, workers' compensation)
     * "taxes_fees" (taxes, customs duties, government fees, local levies)
     * "subcontracting" (third-party contractor companies, outsourced specialized engineering firms, specialized contractors)
     * "utility_expenses" (electricity, water, heating, waste removal, sewage)
     * "other" (any miscellaneous cost not fitting other categories)
All field names must exactly match the schema. Respond strictly with the JSON structure.`;

    const responseSchema = {
      type: Type.OBJECT,
      required: ["supplierName", "invoiceNumber", "date", "totalAmount", "currency", "items", "invoiceType"],
      properties: {
        supplierName: {
          type: Type.STRING,
          description: "The name of the vendor, supplier, or issuer of the invoice.",
        },
        invoiceNumber: {
          type: Type.STRING,
          description: "The invoice identifier, number or series.",
        },
        date: {
          type: Type.STRING,
          description: "The issue date in YYYY-MM-DD format.",
        },
        totalAmount: {
          type: Type.NUMBER,
          description: "The total invoice sum including tax.",
        },
        currency: {
          type: Type.STRING,
          description: "The detected currency code or symbol (e.g. RUB, USD, EUR, KZT, ₸, ₽).",
        },
        invoiceType: {
          type: Type.STRING,
          enum: ["expense", "income"],
          description: "Must be 'income' if the screenshot/invoice represents received money, incoming funds, client payment, or transfer to us. Must be 'expense' if it is a payment to a vendor, purchased goods/services, or funds sent.",
        },
        objectName: {
          type: Type.STRING,
          description: "Optional project, object name, delivery site, or construction site mentioned in the invoice (e.g., 'ул. Ленина 5', or 'Стройплощадка №3').",
        },
        items: {
          type: Type.ARRAY,
          description: "The list of items/lines listed in the invoice table.",
          items: {
            type: Type.OBJECT,
            required: ["description", "type", "quantity", "unitPrice", "totalPrice", "expenseCategory"],
            properties: {
              description: {
                type: Type.STRING,
                description: "The product or service description.",
              },
              type: {
                type: Type.STRING,
                enum: ["goods", "service"],
                description: "Must be strictly either 'goods' or 'service'.",
              },
              quantity: {
                type: Type.NUMBER,
                description: "Number of units.",
              },
              unitPrice: {
                type: Type.NUMBER,
                description: "Price per single unit.",
              },
              totalPrice: {
                type: Type.NUMBER,
                description: "Total calculated price of the row.",
              },
              expenseCategory: {
                type: Type.STRING,
                enum: ["materials", "labor", "equipment_rental", "fuel", "permit", "office_expenses", "insurance", "taxes_fees", "subcontracting", "utility_expenses", "other"],
                description: "Tax expense category of the item.",
              },
              objectName: {
                type: Type.STRING,
                description: "Optional specific project or object/delivery site associated with this single line item, if specified on the row or section.",
              },
            },
          },
        },
      },
    };

    const response = await generateWithFallbackAndRetry(
      aiInstance,
      cleanMimeType,
      image,
      systemPrompt,
      responseSchema
    );

    let textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response received from Gemini model.");
    }

    textOutput = textOutput.trim();
    // Strip markdown code block if present
    if (textOutput.startsWith("```")) {
      textOutput = textOutput.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    }

    const parsedData = JSON.parse(textOutput);
    return res.json({ success: true, invoice: parsedData });
  } catch (error: any) {
    console.error("Error analyzing invoice:", error);
    let errorDetails = "";
    if (error && typeof error === "object" && error.errorDetails) {
      console.error("API Error Details:", JSON.stringify(error.errorDetails));
      errorDetails = ` (${JSON.stringify(error.errorDetails)})`;
    }
    
    const friendlyMessage = cleanErrorMessage(error);
    return res.status(500).json({
      success: false,
      error: friendlyMessage + (errorDetails ? `\nДетали: ${errorDetails}` : ""),
    });
  }
});

// Configure Vite middleware or serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Unhandled error starting express server:", err);
});
