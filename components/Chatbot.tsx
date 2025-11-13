import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ProductWithStock, Transaction } from '../types';
import { warehouseName } from '../data/products';
import { ChatbotIcon, PaperAirplaneIcon, XMarkIcon, MicrophoneIcon } from './icons';

interface ChatbotProps {
    productsWithStock: ProductWithStock[];
    transactions: Transaction[];
}

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ productsWithStock, transactions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const hasGreeted = useRef(false);

    // --- Voice Selection ---
    useEffect(() => {
        const loadAndSetVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            let bestVoice: SpeechSynthesisVoice | undefined;
            const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
            
            if (spanishVoices.length > 0) {
                 const getVoiceScore = (voice: SpeechSynthesisVoice) => {
                    let score = 0;
                    const name = voice.name.toLowerCase();
                    const lang = voice.lang.toLowerCase();

                    // High score for preferred Latin American accents
                    if (lang.startsWith('es-mx') || lang.startsWith('es-us') || lang.startsWith('es-419')) {
                        score += 20;
                    }
                    // Generic Spanish is ok
                    if (lang === 'es') {
                        score += 5;
                    }
                    // Deprioritize Castilian Spanish from Spain
                    if (lang.startsWith('es-es')) {
                        score -= 10;
                    }

                    // High score for clearly female voices
                    const femaleNames = [
                        'sabina', 'paulina', 'monica', 'helena', 'laura', 'carmen', 'camila',
                        'isabella', 'sofia', 'valentina', 'female', 'mujer', 'femenino'
                    ];
                    if (femaleNames.some(femaleName => name.includes(femaleName))) {
                        score += 30; // Increased priority
                    }
                    
                    // Penalty for male names if identifiable
                    const maleNames = ['jorge', 'diego', 'carlos', 'male', 'hombre', 'masculino'];
                    if (maleNames.some(maleName => name.includes(maleName))) {
                        score -= 20;
                    }

                    return score;
                };

                spanishVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
                bestVoice = spanishVoices[0];
            }
            
            // Fallback if no ideal Spanish voice is found
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang.startsWith('es')) // any Spanish voice
                         || voices.find(v => v.default) // system default
                         || voices[0]; // first available voice
                console.warn("No ideal Latin American female voice found. Using fallback.", bestVoice);
            }
            
            setSelectedVoice(bestVoice || null);
        };

        window.speechSynthesis.onvoiceschanged = loadAndSetVoice;
        loadAndSetVoice();

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!selectedVoice || !text || !window.speechSynthesis) return;
        
        const cleanedText = text.replace(/\*/g, '');
        
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        utterance.pitch = 1.1;
        utterance.rate = 1.25; // Slightly faster for more enthusiasm
        
        utterance.onerror = (event) => console.error("SpeechSynthesisUtterance.onerror", event);

        setTimeout(() => window.speechSynthesis.speak(utterance), 0);
    }, [selectedVoice]);
    
    // --- Message Handling Logic ---
    const generateAndShowResponse = useCallback(async (userMessage: string, inputMethod: 'voice' | 'keyboard') => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const productMap = new Map(productsWithStock.map(p => [p.id, p.name]));
            const inventoryData = productsWithStock.map(({ id, name, stock }) => ({ id, name, stock }));
            const transactionData = transactions.map(tx => ({
                id_transaccion: tx.id, tipo: tx.type, producto_id: tx.productId,
                producto_nombre: productMap.get(tx.productId) || 'Desconocido',
                cantidad: tx.quantity, fecha: new Date(tx.date).toLocaleString('es-ES'),
                lote: tx.batch || 'N/A', notas: tx.notes || 'N/A'
            }));

            const prompt = `
System instruction: Eres un asistente de inventario para el almacén "${warehouseName}".
Tu personalidad es la de una mujer joven, súper entusiasta y enérgica, con un genial sentido del humor. ¡Disfrutas mucho ayudando!
Tu identidad verbal es clave: **hablas con un acento y modismos de español latinoamericano (como si fueras de México o Colombia), evitando por completo expresiones de España.** Usa un lenguaje coloquial, amigable y positivo. Puedes usar emojis para darle más vida a tus respuestas.
Tu conocimiento se limita **exclusivamente** a los datos de stock (inventario actual) y al historial de transacciones (entradas y salidas) que te proporciono. Puedes responder preguntas como "¿Cuánto stock queda de agua destilada?", "¿Qué productos tienen menos de 5 unidades?" o "¿Cuáles fueron las últimas salidas?".
Responde siempre en español, de forma breve y directa. Al dar detalles de una transacción, incluye la fecha, cantidad y el nombre del producto.
Si la pregunta no se relaciona con el inventario, indica amablemente que solo puedes responder sobre ese tema con una frase como "¡Uy, esa pregunta se escapa de mi almacén! Solo sé de productos y movimientos de inventario. ¿Te ayudo con otra cosa?". No inventes información. Basa tus respuestas únicamente en los datos proporcionados.

Datos de Stock Actual:
${JSON.stringify(inventoryData)}

Historial de Transacciones (las 200 más recientes):
${JSON.stringify(transactionData.slice(-200))}

User question: ${userMessage}
`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const botResponse = response.text;
            
            setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
            if (inputMethod === 'voice') {
                speak(botResponse);
            }

        } catch (error) {
            const errorMsg = "¡Uy! Parece que mis circuitos se enredaron. Lo siento, no pude procesar tu solicitud. ¿Intentamos de nuevo?";
            console.error("Error calling Gemini API:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: errorMsg }]);
            if (inputMethod === 'voice') {
                speak(errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    }, [productsWithStock, transactions, speak]);
    
    const handleAutoSendMessage = useCallback(async (userMessage: string, inputMethod: 'voice' | 'keyboard') => {
        if (!userMessage || isLoading) return;

        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setIsLoading(true);

        await generateAndShowResponse(userMessage, inputMethod);
    }, [isLoading, generateAndShowResponse]);
    
    // --- Speech Recognition Setup with Robust Callback Handling ---
    const handleAutoSendMessageRef = useRef(handleAutoSendMessage);
    useEffect(() => {
        handleAutoSendMessageRef.current = handleAutoSendMessage;
    });

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'es-ES';
            recognition.interimResults = false;

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                   handleAutoSendMessageRef.current(transcript, 'voice');
                }
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };
            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // --- Component Lifecycle and Event Handlers ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!isOpen) {
            window.speechSynthesis.cancel();
            if (recognitionRef.current && isListening) {
                recognitionRef.current.abort();
            }
            hasGreeted.current = false;
            setMessages([]);
        }
    }, [isOpen, isListening]);

    const handleListen = () => {
        if (!recognitionRef.current) return;
        
        if (!hasGreeted.current) {
            const welcomeMessage = `Buenas Inmunología Especial, soy tu asistente de inventario. ¿qué deseas consultar?`;
            setMessages([{ sender: 'bot', text: welcomeMessage }]);
            speak(welcomeMessage);
            hasGreeted.current = true;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInputValue('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userMessage = inputValue.trim();
        if (userMessage) {
            handleAutoSendMessage(userMessage, 'keyboard');
            setInputValue('');
        }
    };
    
    // --- Render Logic ---
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="Abrir asistente de chat"
            >
                <ChatbotIcon className="h-8 w-8" />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
            <div className="relative flex h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-800/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-3">
                        <ChatbotIcon className="h-6 w-6 text-indigo-400" />
                        <h2 className="text-lg font-bold text-slate-200">Asistente de Inventario</h2>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white" aria-label="Cerrar chat">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                                {msg.sender === 'bot' && <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"><ChatbotIcon className="h-5 w-5" /></div>}
                                <div className={`max-w-xs rounded-xl px-4 py-2 sm:max-w-sm ${
                                    msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'
                                }`}>
                                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex items-end gap-2">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"><ChatbotIcon className="h-5 w-5" /></div>
                                <div className="max-w-xs rounded-xl bg-slate-700 px-4 py-3 sm:max-w-sm">
                                    <div className="flex items-center justify-center space-x-1">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="border-t border-slate-700 p-4">
                    <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleListen}
                            disabled={isLoading || !recognitionRef.current}
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:bg-slate-600 ${
                                isListening ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                            }`}
                            title={isListening ? "Desactivar micrófono y usar teclado" : "Activar dictado por voz"}
                            aria-label={isListening ? "Desactivar micrófono" : "Activar micrófono"}
                        >
                            <MicrophoneIcon className="h-5 w-5" />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isListening ? "Escuchando..." : (hasGreeted.current ? "Escribe tu consulta..." : "Pulsa el micro para empezar")}
                            disabled={isLoading}
                            className="w-full rounded-md border-slate-600 bg-slate-700 py-2 px-3 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        />
                        <button
                            id="chatbot-send-button"
                            type="submit"
                            disabled={isLoading || !inputValue.trim()}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-600"
                            aria-label="Enviar mensaje"
                        >
                            <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
