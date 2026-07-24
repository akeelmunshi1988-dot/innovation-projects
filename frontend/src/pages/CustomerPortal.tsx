import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { RefreshCw, Download, Zap, Maximize2, X, Search, CheckCircle2, Send, CheckCircle, AlertTriangle, ShoppingBag, Calculator } from "lucide-react";
import CustomerLayout from "../components/CustomerLayout";
import { fmtExact, currencySymbol } from "../utils/currency";
import { fmtSize, feetToUnit, toMetres } from "../utils/size";
import { getPublicSettings } from "../services/api";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";

const CUSTOMER_CURRENCY = 'INR';
const sym = currencySymbol(CUSTOMER_CURRENCY);
const fmtC = (n: number) => fmtExact(n, CUSTOMER_CURRENCY);

type Point = [number, number];

interface CatalogRug {
  id: number;
  name: string;
  description: string;
  material: string;
  material_type: string;
  weave_type: string;
  image_url: string | null;
  available: boolean;
  base_price_per_sqm: number;
  sizes: string[];
  lead_time_days: number;
}

type QuoteShape = 'rect' | 'circle' | 'oval';

interface QuoteForm {
  name: string;
  email: string;
  phone: string;
  size_w: string;
  size_h: string;
  qty: string;
  rush_order: boolean;
  notes: string;
  shape: QuoteShape;
}

const STEPS = ["Room photo", "Choose a rug", "Place & Generate"];
const DEFAULT_ROOM_SRC = "/room-canvas.jpg";

// Default perspective corners as fractions of image dimensions
// Floor in the sample room starts ~65% from top; bottom ~94%
const defaultPoints = (w: number, h: number): Point[] => [
  [w * 0.32, h * 0.70],
  [w * 0.72, h * 0.70],
  [w * 0.88, h * 0.98],
  [w * 0.12, h * 0.98],
];

export default function CustomerPortal() {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const canvasSectionRef = useRef<HTMLDivElement>(null);
  const quoteSectionRef  = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customer, isCustomerAuthenticated } = useCustomerAuth();
  const preselectedId = searchParams.get('rug_id') ? parseInt(searchParams.get('rug_id')!) : null;
  const didPreselect = useRef(false);

  const [roomFile, setRoomFile]         = useState<File | null>(null);
  const [roomPreview, setRoomPreview]   = useState<string>(DEFAULT_ROOM_SRC);
  const [catalog, setCatalog]           = useState<CatalogRug[]>([]);
  const [selectedRug, setSelectedRug]   = useState<CatalogRug | null>(null);
  const [materialFilter, setMaterialFilter] = useState("All");
  const [searchQuery, setSearchQuery]   = useState("");
  const [draggingIdx, setDraggingIdx]   = useState<number | null>(null);
  const [draggingAll, setDraggingAll]   = useState(false);
  const [hoverIdx, setHoverIdx]         = useState<number | null>(null);
  const [hoverInside, setHoverInside]   = useState(false);
  const [rugShape, setRugShape]         = useState<'rect' | 'circle'>('rect');
  const wasDraggingRef      = useRef(false);
  const dragAllStartRef     = useRef<Point | null>(null);
  const latestPointsRef     = useRef<Point[]>([]);
  const prevResultImageRef  = useRef<string>("");   // saved result before entering custom mode

  const maxPoints = 4;
  const [points, setPoints]             = useState<Point[]>([]);
  const [imageDims, setImageDims]       = useState({ w: 0, h: 0 });
  const [customMode, setCustomMode]     = useState(false);
  const [resultImage, setResultImage]   = useState<string>("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string>("");
  const [lightbox, setLightbox]         = useState(false);

  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    name: "", email: "", phone: "", size_w: "", size_h: "",
    qty: "1", rush_order: false, notes: "", shape: "rect",
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSubmitted, setQuoteSubmitted]   = useState(false);
  const [quoteError, setQuoteError]           = useState<string>("");
  const [quoteResult, setQuoteResult]         = useState<{ quote_id: number; final_price: number; lead_time_days: number } | null>(null);

  interface EstimateResult {
    final_price: number; pre_gst_price: number; gst_pct: number; gst_amount: number;
    subtotal: number; bulk_discount: number; rush_surcharge: number; size_surcharge: number;
    price_per_piece: number; size_sqm: number; total_sqm: number; price_currency: string;
    estimated_days: number; rush_available: boolean;
  }
  const [estimate, setEstimate]         = useState<EstimateResult | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('ft');

  const loadDefaultRoom = () => {
    fetch(DEFAULT_ROOM_SRC).then((r) => r.blob()).then((blob) => {
      setRoomFile(new File([blob], "room-canvas.jpg", { type: blob.type || "image/jpeg" }));
    }).catch(() => {});
  };

  useEffect(() => {
    axios.get("/api/customer/catalog").then(({ data }) => setCatalog(data)).catch(() => {});
    loadDefaultRoom();
    getPublicSettings().then((data) => setSizeUnit(data.default_size_unit || 'ft')).catch(() => {});
  }, []);

  useEffect(() => {
    if (resultImage) return;        // canvas is not in DOM when result is showing
    if (!roomPreview || !selectedRug) return;
    drawCanvas(points);
  }, [roomPreview, points, selectedRug, resultImage, rugShape]);

  const pendingRugRef  = useRef<CatalogRug | null>(null);
  const roomFileRef    = useRef<File | null>(null);   // always-current copy for effects

  // Keep roomFileRef in sync so effects always see the latest file
  useEffect(() => { roomFileRef.current = roomFile; }, [roomFile]);

  // When imageDims become known: apply default corners + auto-generate if a rug is pending
  useEffect(() => {
    const file = roomFileRef.current;
    if (imageDims.w === 0) return;
    if (customMode) {
      // In adjust-corners mode: always reset corners to default for the new image
      setPoints(defaultPoints(imageDims.w, imageDims.h));
    } else if (pendingRugRef.current && file) {
      const rug = pendingRugRef.current;
      pendingRugRef.current = null;
      const pts = defaultPoints(imageDims.w, imageDims.h);
      setPoints(pts);
      generateWith(pts, rug, file);
    }
  }, [imageDims]);

  const drawCanvas = (pts: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = roomPreview;
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      // Store dims for default corner calculation
      setImageDims(d => d.w === img.naturalWidth && d.h === img.naturalHeight ? d : { w: img.naturalWidth, h: img.naturalHeight });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0);
      const r = Math.max(14, canvas.width / 55);
      const lw = Math.max(3, canvas.width / 300);
      const dash: [number, number] = [Math.max(8, canvas.width / 80), Math.max(5, canvas.width / 120)];
      const colors = ["#f97316", "#eab308", "#22c55e", "#3b82f6"];

      // ── Draw rug boundary outline ──────────────────────────────────────────
      const needed = 4;
      if (pts.length === needed) {
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = lw;
        ctx.setLineDash(dash);
        if (rugShape === 'circle') {
          // Inscribed ellipse from bounding parallelogram
          const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
          const cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
          const rx = (Math.hypot(pts[1][0]-pts[0][0], pts[1][1]-pts[0][1]) +
                      Math.hypot(pts[2][0]-pts[3][0], pts[2][1]-pts[3][1])) / 4;
          const ry = (Math.hypot(pts[3][0]-pts[0][0], pts[3][1]-pts[0][1]) +
                      Math.hypot(pts[2][0]-pts[1][0], pts[2][1]-pts[1][1])) / 4;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        } else {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < needed; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fill();
      }

      // ── Corner markers (circles) ───────────────────────────────────────────
      pts.forEach(([x, y], i) => {
        ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.40)"; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fillStyle = colors[i]; ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(18, canvas.width / 60)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x, y);
      });
    };
  };

  // Core generate — accepts pts/rug/file directly to avoid stale state
  const generateWith = async (pts: Point[], rug: CatalogRug, file: File) => {
    setLoading(true); setError(""); setResultImage("");
    const formData = new FormData();
    formData.append("roomImage", file);
    formData.append("rug_id", String(rug.id));
    formData.append("corners", JSON.stringify(pts));
    formData.append("shape", rugShape);
    try {
      const { data } = await axios.post("/api/replace-rug", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResultImage(data.imageUrl.replace("http://localhost:8000", ""));
    } catch (err: any) {
      setError(err.response?.data?.detail || "Generation failed. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRug = useCallback((rug: CatalogRug) => {
    setSelectedRug(rug);
    setResultImage("");
    setError("");
    setCustomMode(false);
    const file = roomFileRef.current;
    if (imageDims.w > 0 && file) {
      const pts = defaultPoints(imageDims.w, imageDims.h);
      setPoints(pts);
      generateWith(pts, rug, file);
    } else {
      setPoints([]);
      pendingRugRef.current = rug;
    }
    setTimeout(() => canvasSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [imageDims]);

  // Auto-select rug when navigated from detail page with ?rug_id=
  useEffect(() => {
    if (!preselectedId || catalog.length === 0 || didPreselect.current) return;
    const rug = catalog.find(r => r.id === preselectedId);
    if (rug) {
      didPreselect.current = true;
      handleSelectRug(rug);
    }
  }, [catalog, preselectedId, handleSelectRug]);

  const enterCustomMode = () => {
    prevResultImageRef.current = resultImage;   // save so Cancel can restore it
    setCustomMode(true);
    setResultImage("");
    if (points.length === 0 && imageDims.w > 0) {
      setPoints(defaultPoints(imageDims.w, imageDims.h));
    }
  };

  const cancelCustomMode = () => {
    setCustomMode(false);
    setResultImage(prevResultImageRef.current); // restore the previous result
    prevResultImageRef.current = "";
  };

  const useDefaultMode = () => {
    setCustomMode(false);
    if (imageDims.w > 0 && selectedRug && roomFile) {
      const pts = defaultPoints(imageDims.w, imageDims.h);
      setPoints(pts);
      generateWith(pts, selectedRug, roomFile);
    }
  };

  // Always keep a current-value ref of points for use inside event callbacks
  useEffect(() => { latestPointsRef.current = points; }, [points]);

  // Check whether a canvas point lies inside the current shape boundary
  const isInsideShape = (x: number, y: number): boolean => {
    const pts = latestPointsRef.current;
    if (pts.length < maxPoints) return false;
    if (rugShape === 'circle') {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const rx = (Math.hypot(pts[1][0]-pts[0][0], pts[1][1]-pts[0][1]) +
                  Math.hypot(pts[2][0]-pts[3][0], pts[2][1]-pts[3][1])) / 4;
      const ry = (Math.hypot(pts[3][0]-pts[0][0], pts[3][1]-pts[0][1]) +
                  Math.hypot(pts[2][0]-pts[1][0], pts[2][1]-pts[1][1])) / 4;
      return (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1;
    }
    // Ray-casting for polygon (triangle or quad)
    let inside = false;
    const n = pts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  };

  // Convert mouse/touch event to canvas pixel coordinates
  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0] ?? e.changedTouches[0] : e;
    return [(src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY];
  };

  // Find which corner is under cursor (hit radius in canvas px)
  const HIT_RADIUS = 28;
  const nearestPoint = (x: number, y: number): number | null => {
    let best: number | null = null;
    let bestDist = HIT_RADIUS;
    points.forEach(([px, py], i) => {
      const d = Math.hypot(px - x, py - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (points.length === 0) return;
    const [x, y] = toCanvasCoords(e);
    const idx = nearestPoint(x, y);
    if (idx !== null) {
      e.preventDefault();
      wasDraggingRef.current = false;
      setDraggingIdx(idx);
    } else if (points.length === maxPoints && isInsideShape(x, y)) {
      e.preventDefault();
      wasDraggingRef.current = false;
      dragAllStartRef.current = [x, y];
      setDraggingAll(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const [x, y] = toCanvasCoords(e);
    if (draggingIdx !== null) {
      wasDraggingRef.current = true;
      setPoints(prev => { const n = [...prev]; n[draggingIdx] = [x, y]; return n; });
    } else if (draggingAll && dragAllStartRef.current) {
      wasDraggingRef.current = true;
      const dx = x - dragAllStartRef.current[0];
      const dy = y - dragAllStartRef.current[1];
      dragAllStartRef.current = [x, y];
      setPoints(prev => prev.map(([px, py]) => [px + dx, py + dy] as Point));
    } else {
      setHoverIdx(nearestPoint(x, y));
      setHoverInside(points.length === maxPoints && isInsideShape(x, y));
    }
  };

  const finishDrag = () => {
    const wasDragging = wasDraggingRef.current;
    wasDraggingRef.current = false;
    setDraggingIdx(null);
    setDraggingAll(false);
    dragAllStartRef.current = null;
    if (wasDragging && !customMode && selectedRug && roomFile) {
      const pts = latestPointsRef.current;
      if (pts.length === maxPoints) generateWith(pts, selectedRug, roomFile);
    }
  };

  const handleCanvasMouseUp  = finishDrag;
  const handleCanvasMouseLeave = () => { setHoverIdx(null); setHoverInside(false); finishDrag(); };

  // Touch equivalents
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (points.length === 0) return;
    const [x, y] = toCanvasCoords(e);
    const idx = nearestPoint(x, y);
    if (idx !== null) {
      e.preventDefault();
      wasDraggingRef.current = false;
      setDraggingIdx(idx);
    } else if (points.length === maxPoints && isInsideShape(x, y)) {
      e.preventDefault();
      wasDraggingRef.current = false;
      dragAllStartRef.current = [x, y];
      setDraggingAll(true);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const [x, y] = toCanvasCoords(e);
    if (draggingIdx !== null) {
      wasDraggingRef.current = true;
      setPoints(prev => { const n = [...prev]; n[draggingIdx] = [x, y]; return n; });
    } else if (draggingAll && dragAllStartRef.current) {
      wasDraggingRef.current = true;
      const dx = x - dragAllStartRef.current[0];
      const dy = y - dragAllStartRef.current[1];
      dragAllStartRef.current = [x, y];
      setPoints(prev => prev.map(([px, py]) => [px + dx, py + dy] as Point));
    }
  };

  const handleCanvasTouchEnd = finishDrag;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (wasDraggingRef.current) { wasDraggingRef.current = false; return; }
    if (!customMode || points.length >= maxPoints) return;
    const [x, y] = toCanvasCoords(e);
    setPoints(prev => [...prev, [x, y]]);
  };

  // Cursor: grabbing > move (inside shape) > grab (on corner) > crosshair (placing) > default
  const canvasCursor = (() => {
    if (draggingIdx !== null || draggingAll) return 'grabbing';
    if (hoverIdx !== null) return 'grab';
    if (hoverInside) return 'move';
    if (customMode && points.length < maxPoints) return 'crosshair';
    return 'default';
  })();

  const handleRoomUpload = (file: File) => {
    setRoomFile(file);
    setRoomPreview(URL.createObjectURL(file));
    setPoints([]); setImageDims({ w: 0, h: 0 }); setResultImage(""); setError("");
    pendingRugRef.current = null;
  };

  // Manual generate (custom mode only)
  const generateRug = async () => {
    if (!roomFile || !selectedRug || points.length !== maxPoints) return;
    await generateWith(points, selectedRug, roomFile);
  };

  const reset = () => {
    setRoomFile(null); setRoomPreview(DEFAULT_ROOM_SRC);
    setSelectedRug(null); setPoints([]); setResultImage(""); setError("");
    setQuoteSubmitted(false); setQuoteResult(null); setQuoteError("");
    setQuoteForm({ name: "", email: "", phone: "", size_w: "", size_h: "", qty: "1", rush_order: false, notes: "", shape: "rect" });
    setEstimate(null);
    loadDefaultRoom();
  };

  const handlePlaceOrder = async () => {
    if (!selectedRug) return;
    const w = toMetres(parseFloat(quoteForm.size_w), sizeUnit);
    const h = quoteForm.shape === 'circle' ? w : toMetres(parseFloat(quoteForm.size_h), sizeUnit);
    const qty = parseInt(quoteForm.qty) || 1;
    if (!w || (!h && quoteForm.shape !== 'circle')) {
      navigate(`/catalog/${selectedRug.id}`);
      return;
    }
    try {
      const { data } = await axios.post(`/api/customer/catalog/${selectedRug.id}/estimate`, {
        size_w: w, size_h: h, qty, rush_order: quoteForm.rush_order, shape: quoteForm.shape,
      });
      navigate('/checkout', {
        state: {
          rug_id: selectedRug.id,
          rug_name: selectedRug.name,
          size_w: w, size_h: h, qty,
          rush_order: quoteForm.rush_order,
          shape: quoteForm.shape,
          notes: quoteForm.notes || undefined,
          estimated_price: data.final_price,
          pre_gst_price: data.pre_gst_price,
          gst_pct: data.gst_pct,
          gst_amount: data.gst_amount,
          price_currency: data.price_currency ?? 'INR',
          estimated_days: data.estimated_days,
          name:  quoteForm.name  || undefined,
          email: quoteForm.email || undefined,
          phone: quoteForm.phone || undefined,
        },
      });
    } catch {
      navigate(`/catalog/${selectedRug.id}`);
    }
  };

  const handleQuoteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setQuoteForm(prev => ({ ...prev, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRug) return;
    setQuoteSubmitting(true); setQuoteError("");
    try {
      const sw = toMetres(parseFloat(quoteForm.size_w), sizeUnit);
      const sh = quoteForm.shape === 'circle' ? sw : toMetres(parseFloat(quoteForm.size_h), sizeUnit);
      const { data } = await axios.post("/api/customer/request-quote", {
        name:       isCustomerAuthenticated && customer ? customer.name : quoteForm.name,
        email:      isCustomerAuthenticated && customer ? customer.email : quoteForm.email,
        phone:      quoteForm.phone || null,
        rug_id:     selectedRug.id,
        size_w:     sw,
        size_h:     sh,
        qty:        parseInt(quoteForm.qty) || 1,
        rush_order: quoteForm.rush_order,
        shape:      quoteForm.shape,
        notes:      quoteForm.notes || null,
      });
      setQuoteResult({ quote_id: data.quote_id, final_price: data.final_price, lead_time_days: data.lead_time_days });
      setQuoteSubmitted(true);
    } catch (err: any) {
      setQuoteError(err.response?.data?.detail || "Failed to submit. Please try again.");
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleEstimate = async () => {
    if (!selectedRug) return;
    const sw = toMetres(parseFloat(quoteForm.size_w), sizeUnit);
    const sh = quoteForm.shape === 'circle' ? sw : toMetres(parseFloat(quoteForm.size_h), sizeUnit);
    if (!sw || (!sh && quoteForm.shape !== 'circle')) return;
    setEstimateLoading(true);
    try {
      const { data } = await axios.post(`/api/customer/catalog/${selectedRug.id}/estimate`, {
        size_w: sw, size_h: sh, qty: parseInt(quoteForm.qty) || 1,
        rush_order: quoteForm.rush_order, shape: quoteForm.shape,
      });
      setEstimate(data);
    } catch {
      // silently ignore — user can retry
    } finally {
      setEstimateLoading(false);
    }
  };

  const currentStep = !selectedRug ? 1 : 2;
  const isDefaultRoom = roomPreview === DEFAULT_ROOM_SRC;
  const materials = ["All", ...Array.from(new Set(catalog.map((r) => r.material).filter(Boolean)))];
  const filtered = catalog.filter((r) => {
    const byMaterial = materialFilter === "All" || r.material === materialFilter;
    const bySearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
    return byMaterial && bySearch;
  });

  return (
    <CustomerLayout>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap border-b border-stone-100 pb-8">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">AI Tool</p>
            <h1 className="font-serif text-4xl font-light text-stone-900">Room Visualizer</h1>
            <p className="text-stone-400 text-sm mt-1">See any rug in your space before you order</p>
          </div>
          {(roomFile || resultImage) && (
            <button onClick={reset}
              className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-sm transition-colors"
            >
              <RefreshCw size={13} /> Start Over
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center overflow-x-auto">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                i < currentStep   ? "text-stone-400" :
                i === currentStep ? "text-stone-900 font-medium" : "text-stone-300"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  i <= currentStep ? "bg-stone-900 text-white" : "border border-stone-200 text-stone-300"
                }`}>
                  {i < currentStep ? "✓" : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="w-5 h-px bg-stone-200 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* ── Main layout: small room thumbnail left + canvas right ── */}
        <div className="flex gap-5 items-start">

          {/* Small room thumbnail — left */}
          <div className="flex-shrink-0 w-40 space-y-2">
            <p className="text-xs text-stone-400 uppercase tracking-widest">Room</p>
            <div
              onClick={() => document.getElementById('room-file-input')?.click()}
              className={`relative cursor-pointer overflow-hidden border-2 border-dashed aspect-[3/4] transition-colors ${
                isDefaultRoom ? "border-stone-200 hover:border-stone-400" : "border-stone-400"
              }`}
            >
              <img src={roomPreview} alt="Room" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-900/0 hover:bg-stone-900/20 transition-colors flex items-end justify-center pb-2">
                <span className="opacity-0 hover:opacity-100 bg-white/90 text-stone-700 text-xs px-2 py-1 transition-opacity">
                  Replace
                </span>
              </div>
              {isDefaultRoom && (
                <div className="absolute top-1 left-1 bg-white/90 text-stone-500 text-xs px-1.5 py-0.5">
                  Sample
                </div>
              )}
            </div>
            <input id="room-file-input" type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRoomUpload(f); }}
            />
            {!isDefaultRoom && (
              <p className="text-green-600 text-xs">✓ Your photo</p>
            )}

            {/* Selected rug thumbnail */}
            {selectedRug && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs text-stone-400 uppercase tracking-widest">Rug</p>
                <div className="overflow-hidden aspect-[4/3] border border-stone-200">
                  {selectedRug.image_url
                    ? <img src={selectedRug.image_url} alt={selectedRug.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-stone-100" />}
                </div>
                <p className="text-stone-600 text-xs font-medium leading-tight">{selectedRug.name}</p>
                <p className="text-stone-400 text-xs">{selectedRug.material}</p>
              </div>
            )}
          </div>

          {/* Main canvas area — right */}
          <div ref={canvasSectionRef} className="flex-1 min-w-0 space-y-3">
            {resultImage ? (
              /* ── Result shown inline in the big picture ── */
              <>
                {/* Top bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-stone-500 text-xs">
                    <span className="text-green-600 font-medium">✓ Done</span>
                    {selectedRug && ` — ${selectedRug.name}`}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setCustomMode(false); if (selectedRug && roomFile && imageDims.w > 0) { const pts = defaultPoints(imageDims.w, imageDims.h); setPoints(pts); generateWith(pts, selectedRug, roomFile); } else { setResultImage(""); } }}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs transition-colors"
                    ><RefreshCw size={11} /> Try Again</button>
                    <button onClick={enterCustomMode}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 hover:border-stone-600 text-stone-600 hover:text-stone-900 text-xs transition-colors"
                    >✏ Adjust Corners</button>
                    <a href={resultImage} download="room-with-rug.jpg"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs transition-colors"
                    ><Download size={11} /> Download</a>
                    <button onClick={() => quoteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase transition-colors"
                    ><ShoppingBag size={11} /> Place Order</button>
                  </div>
                </div>

                {/* Image */}
                <div className="relative overflow-hidden border border-stone-200 cursor-zoom-in group"
                  onClick={() => setLightbox(true)}
                >
                  <img src={resultImage} alt="Room with rug" className="w-full block" />
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-2">
                      <Maximize2 size={16} className="text-stone-700" />
                    </div>
                  </div>
                </div>

                {/* Bottom buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => { setCustomMode(false); if (selectedRug && roomFile && imageDims.w > 0) { const pts = defaultPoints(imageDims.w, imageDims.h); setPoints(pts); generateWith(pts, selectedRug, roomFile); } else { setResultImage(""); } }}
                    className="flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs transition-colors"
                  ><RefreshCw size={12} /> Try Again</button>
                  <button onClick={enterCustomMode}
                    className="flex items-center justify-center gap-1.5 py-2.5 border border-stone-300 hover:border-stone-600 text-stone-600 hover:text-stone-900 text-xs transition-colors"
                  >✏ Adjust Corners</button>
                  <a href={resultImage} download="room-with-rug.jpg"
                    className="flex items-center justify-center gap-1.5 py-2.5 border border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-900 text-xs transition-colors"
                  ><Download size={12} /> Download</a>
                  <button onClick={() => quoteSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase transition-colors"
                  ><ShoppingBag size={12} /> Place Order</button>
                </div>
              </>
            ) : selectedRug ? (
              /* ── Canvas with corner placement ── */
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    {loading ? (
                      <h2 className="text-stone-500 font-medium text-sm">Placing rug on floor…</h2>
                    ) : customMode ? (
                      <>
                        <h2 className="text-stone-900 font-medium text-sm">
                          {points.length < maxPoints
                            ? `Click point ${points.length + 1} of ${maxPoints}`
                            : "Drag points to adjust · click Generate when ready"}
                        </h2>
                        <p className="text-stone-400 text-xs mt-0.5">
                          {points.length < maxPoints
                            ? rugShape === 'circle'
                              ? "Click 4 corners of the oval rug boundary"
                              : "top-left → top-right → bottom-right → bottom-left"
                            : "Grab any numbered dot and drag it to adjust"}
                        </p>
                      </>
                    ) : (
                      <p className="text-stone-400 text-xs">Select a different rug to swap instantly</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap items-center">
                    {/* Rug boundary shape picker — always visible */}
                    {!loading && (
                      <div className="flex border border-stone-200 overflow-hidden" title="Rug shape">
                        {([
                          { key: 'rect',   label: '▭', title: 'Rectangle' },
                          { key: 'circle', label: '◯', title: 'Oval'      },
                        ] as const).map(({ key, label, title }) => (
                          <button key={key} onClick={() => { setRugShape(key); setPoints([]); setResultImage(""); }}
                            title={title}
                            className={`px-2.5 py-1.5 text-sm transition-colors ${
                              rugShape === key
                                ? 'bg-stone-900 text-white'
                                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                    )}
                    {!loading && customMode ? (
                      <>
                        {points.length > 0 && points.length < maxPoints && (
                          <button onClick={() => setPoints(p => p.slice(0, -1))}
                            className="px-3 py-1.5 border border-stone-200 hover:border-stone-400 text-stone-500 text-xs transition-colors"
                          >↩ Undo</button>
                        )}
                        <button onClick={useDefaultMode}
                          className="px-3 py-1.5 border border-stone-200 hover:border-stone-400 text-stone-500 text-xs transition-colors"
                        >Use Default</button>
                        {points.length === maxPoints && (
                          <button onClick={generateRug} disabled={loading}
                            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase px-5 py-1.5 transition-colors flex items-center gap-2"
                          >
                            <Zap size={13} /> Generate
                          </button>
                        )}
                        <button onClick={cancelCustomMode}
                          className="px-3 py-1.5 border border-red-200 hover:border-red-400 text-red-500 hover:text-red-700 text-xs transition-colors"
                        >✕ Cancel</button>
                      </>
                    ) : !loading ? (
                      <button onClick={enterCustomMode}
                        className="px-3 py-1.5 border border-stone-300 hover:border-stone-600 text-stone-600 hover:text-stone-900 text-xs transition-colors font-medium"
                      >✏ Draw Custom</button>
                    ) : null}
                  </div>
                </div>

                {/* Custom mode corner legend */}
                {customMode && !loading && (
                  <div className="flex gap-4 flex-wrap">
                    {["Top-left", "Top-right", "Bottom-right", "Bottom-left"].map((label, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs ${i < points.length ? "text-stone-700" : "text-stone-300"}`}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{
                          backgroundColor: i < points.length ? ["#f97316","#eab308","#22c55e","#3b82f6"][i] : "#e5e7eb"
                        }} />
                        {i + 1}. {label}
                        {i < points.length && <span className="text-stone-400">(drag)</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Canvas + loading overlay */}
                <div className="relative overflow-hidden border border-stone-200">
                  <canvas
                    ref={canvasRef}
                    className="w-full block"
                    style={{ cursor: canvasCursor }}
                    onClick={handleCanvasClick}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
                    onTouchStart={handleCanvasTouchStart}
                    onTouchMove={handleCanvasTouchMove}
                    onTouchEnd={handleCanvasTouchEnd}
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-8 h-8 border border-stone-400 border-t-stone-900 rounded-full animate-spin mx-auto" />
                        <p className="text-stone-600 text-sm font-medium">Placing rug…</p>
                      </div>
                    </div>
                  )}
                  {customMode && !loading && points.length === 0 && (
                    <div className="absolute inset-0 flex items-end justify-center pb-5 pointer-events-none">
                      <div className="bg-white/90 px-4 py-2 border border-stone-200">
                        <p className="text-stone-700 text-xs text-center">Click the 4 corners of the floor area</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom controls — mirror of top toolbar, shown only in custom mode */}
                {customMode && !loading && (
                  <div className="flex items-center justify-between gap-2 flex-wrap border border-stone-100 bg-stone-50 px-3 py-2.5">
                    <p className="text-stone-500 text-xs">
                      {points.length < maxPoints
                        ? rugShape === 'circle' ? "Click 4 corners of the oval boundary" : "top-left → top-right → bottom-right → bottom-left"
                        : "Grab any numbered dot and drag it to adjust"}
                    </p>
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* Shape picker */}
                      <div className="flex border border-stone-200 overflow-hidden">
                        {([
                          { key: 'rect',   label: '▭', title: 'Rectangle' },
                          { key: 'circle', label: '◯', title: 'Oval'      },
                        ] as const).map(({ key, label, title }) => (
                          <button key={key} onClick={() => { setRugShape(key); setPoints([]); setResultImage(""); }}
                            title={title}
                            className={`px-2.5 py-1 text-sm transition-colors ${rugShape === key ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-white'}`}
                          >{label}</button>
                        ))}
                      </div>
                      <button onClick={useDefaultMode}
                        className="px-3 py-1 border border-stone-200 hover:border-stone-400 text-stone-500 text-xs transition-colors"
                      >Use Default</button>
                      {points.length === maxPoints && (
                        <button onClick={generateRug}
                          className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase px-4 py-1 transition-colors flex items-center gap-1.5"
                        ><Zap size={12} /> Generate</button>
                      )}
                      <button onClick={cancelCustomMode}
                        className="px-3 py-1 border border-red-200 hover:border-red-400 text-red-500 hover:text-red-700 text-xs transition-colors"
                      >✕ Cancel</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* No rug selected — dimmed room with prompt */
              <div className="relative overflow-hidden border border-stone-100 aspect-video flex items-center justify-center bg-stone-50">
                <img src={roomPreview} alt="Room" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                <div className="relative text-center space-y-1">
                  <p className="text-stone-600 text-sm font-medium">Select a rug below to continue</p>
                  <p className="text-stone-400 text-xs">It will be placed on the floor automatically</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 text-red-600 text-sm text-center">{error}</div>
        )}

        {/* ── Rug selection grid — below canvas ── */}
        <div className="border-t border-stone-100 pt-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                {resultImage ? "Change Rug" : "Step 2"}
              </p>
              <h2 className="text-stone-900 font-medium text-base">
                Choose a rug
                {selectedRug && <span className="ml-2 text-stone-400 font-normal text-sm">— {selectedRug.name}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {materials.map((m) => (
                  <button key={m} onClick={() => setMaterialFilter(m)}
                    className={`px-3 py-1 text-xs border transition-colors ${
                      materialFilter === m
                        ? "bg-stone-900 text-white border-stone-900"
                        : "text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                    }`}
                  >{m}</button>
                ))}
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="border border-stone-200 focus:border-stone-400 pl-7 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-300 focus:outline-none transition-colors w-32"
                />
              </div>
            </div>
          </div>

          {catalog.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-stone-400 text-sm">Loading collection…</div>
          ) : filtered.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-stone-400 text-sm">No rugs match your filters.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map((rug) => {
                const isSelected = selectedRug?.id === rug.id;
                return (
                  <button key={rug.id}
                    onClick={() => handleSelectRug(rug)}
                    className={`relative overflow-hidden border-2 transition-all text-left group ${
                      isSelected ? "border-stone-900" : "border-stone-100 hover:border-stone-300"
                    }`}
                  >
                      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
                        {rug.image_url
                          ? <img src={rug.image_url} alt={rug.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">No image</div>}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-stone-900 text-xs font-medium truncate">{rug.name}</p>
                        <p className="text-stone-400 text-xs">{rug.material}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 size={15} className="text-stone-900" fill="white" />
                        </div>
                      )}
                      {!rug.available && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-stone-400 text-xs">Unavailable</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        {/* Quote panel — shown after generation */}
        {resultImage && selectedRug && (
              <div ref={quoteSectionRef} className="border-t border-stone-100 pt-8">
                <div className="border border-stone-200">
                  <div className="px-6 py-4 border-b border-stone-100">
                    <h3 className="font-serif text-xl font-light text-stone-900">Get a Quote</h3>
                    <p className="text-stone-400 text-sm mt-0.5">{selectedRug.name}</p>
                  </div>

                  {quoteSubmitted && quoteResult ? (
                    <div className="p-8 flex flex-col items-center gap-4 text-center">
                      <CheckCircle size={40} className="text-green-600" />
                      <div>
                        <p className="font-serif text-2xl font-light text-stone-900">Quote Submitted</p>
                        <p className="text-stone-500 text-sm mt-1">Quote #{quoteResult.quote_id} · We'll be in touch shortly.</p>
                      </div>
                      <div className="flex gap-10 border-t border-stone-100 pt-4 w-full justify-center">
                        <div className="text-center">
                          <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Estimated Total</p>
                          <p className="text-stone-900 font-medium text-xl">{fmtC(quoteResult.final_price)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">Expected Delivery</p>
                          <p className="text-stone-900 font-medium text-xl">{quoteResult.lead_time_days} days</p>
                        </div>
                      </div>
                      <button onClick={() => { setQuoteSubmitted(false); setQuoteResult(null); setQuoteError(""); }}
                        className="text-stone-400 hover:text-stone-900 text-sm transition-colors border-b border-stone-200 pb-0.5"
                      >
                        Submit another quote
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleQuoteSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left — rug config */}
                      <div className="space-y-5">
                        {/* Rug summary */}
                        <div className="flex items-center gap-3 border border-stone-100 bg-stone-50 p-3">
                          {selectedRug.image_url ? (
                            <img src={selectedRug.image_url} alt={selectedRug.name} className="w-14 h-14 object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-14 h-14 bg-stone-100 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-stone-900 text-sm font-medium truncate">{selectedRug.name}</p>
                            <p className="text-stone-400 text-xs">{selectedRug.material} · {selectedRug.weave_type}</p>
                            <p className="text-stone-600 text-xs mt-0.5">{sym}{selectedRug.base_price_per_sqm}/sqm · {selectedRug.lead_time_days}d delivery</p>
                          </div>
                        </div>

                        {/* Size quick-select */}
                        {selectedRug.sizes?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-widest text-stone-400">Standard Sizes</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedRug.sizes.map((s) => {
                                const [w, h] = s.split("x").map((v) => parseFloat(v.trim()));
                                const dispW = String(feetToUnit(w, sizeUnit));
                                const dispH = String(feetToUnit(h, sizeUnit));
                                const isActive = quoteForm.size_w === dispW && quoteForm.size_h === dispH;
                                return (
                                  <button key={s} type="button"
                                    onClick={() => setQuoteForm((f) => ({ ...f, size_w: dispW, size_h: dispH }))}
                                    className={`px-3 py-1 text-xs border transition-colors ${
                                      isActive
                                        ? "bg-stone-900 text-white border-stone-900"
                                        : "text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-900"
                                    }`}
                                  >
                                    {fmtSize(s, sizeUnit)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Shape selector */}
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-widest text-stone-400">Shape</p>
                          <div className="flex gap-2">
                            {(['rect', 'circle', 'oval'] as const).map(s => (
                              <button key={s} type="button"
                                onClick={() => setQuoteForm(f => ({
                                  ...f,
                                  shape: s,
                                  size_h: s === 'circle' ? f.size_w : f.size_h,
                                }))}
                                className={`px-3 py-1.5 border text-xs transition-colors ${
                                  quoteForm.shape === s
                                    ? 'bg-stone-900 border-stone-900 text-white'
                                    : 'border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-900'
                                }`}
                              >
                                {s === 'rect' ? 'Rectangle' : s === 'circle' ? 'Circle' : 'Oval'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom size */}
                        <div className="space-y-2">
                          {quoteForm.shape === 'circle' ? (
                            <>
                              <p className="text-xs uppercase tracking-widest text-stone-400">Diameter ({sizeUnit})</p>
                              <input
                                name="size_w" value={quoteForm.size_w}
                                onChange={e => setQuoteForm(f => ({ ...f, size_w: e.target.value, size_h: e.target.value }))}
                                placeholder={sizeUnit === 'cm' ? 'e.g. 300' : 'e.g. 10'} type="number" min={sizeUnit === 'cm' ? '30' : '1'} step={sizeUnit === 'cm' ? '1' : '0.1'} required
                                className="w-40 border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                              />
                              {quoteForm.size_w && parseFloat(quoteForm.size_w) > 0 && (
                                <p className="text-stone-400 text-xs">
                                  Area ≈ {(Math.PI * (toMetres(parseFloat(quoteForm.size_w), sizeUnit) / 2) ** 2).toFixed(2)} m²
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-xs uppercase tracking-widest text-stone-400">
                                {quoteForm.shape === 'oval' ? `Axes (${sizeUnit})` : `Size (${sizeUnit})`}
                              </p>
                              <div className="flex gap-2 items-center">
                                <input name="size_w" value={quoteForm.size_w} onChange={handleQuoteChange}
                                  placeholder={quoteForm.shape === 'oval' ? 'Axis A' : 'Width'} type="number" min={sizeUnit === 'cm' ? '30' : '1'} step={sizeUnit === 'cm' ? '1' : '0.1'} required
                                  className="flex-1 border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                                />
                                <span className="text-stone-300 text-sm">×</span>
                                <input name="size_h" value={quoteForm.size_h} onChange={handleQuoteChange}
                                  placeholder={quoteForm.shape === 'oval' ? 'Axis B' : 'Height'} type="number" min={sizeUnit === 'cm' ? '30' : '1'} step={sizeUnit === 'cm' ? '1' : '0.1'} required
                                  className="flex-1 border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                                />
                              </div>
                              {quoteForm.shape === 'oval' && quoteForm.size_w && quoteForm.size_h &&
                               parseFloat(quoteForm.size_w) > 0 && parseFloat(quoteForm.size_h) > 0 && (
                                <p className="text-stone-400 text-xs">
                                  Area ≈ {(Math.PI * (toMetres(parseFloat(quoteForm.size_w), sizeUnit) / 2) * (toMetres(parseFloat(quoteForm.size_h), sizeUnit) / 2)).toFixed(2)} m²
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Qty + Rush */}
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2">
                            <label className="text-xs uppercase tracking-widest text-stone-400 block">Quantity</label>
                            <input name="qty" value={quoteForm.qty} onChange={handleQuoteChange}
                              type="number" min="1" required
                              className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm focus:outline-none transition-colors"
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer"
                              onClick={() => { setQuoteForm((f) => ({ ...f, rush_order: !f.rush_order })); setEstimate(null); }}
                            >
                              <div className="relative flex-shrink-0">
                                <div className={`w-9 h-5 rounded-full transition-colors ${quoteForm.rush_order ? "bg-stone-900" : "bg-stone-200"}`} />
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${quoteForm.rush_order ? "translate-x-5" : "translate-x-0.5"}`} />
                              </div>
                              <div>
                                <span className="text-stone-700 text-xs font-medium whitespace-nowrap">Early Delivery (+25%)</span>
                                {selectedRug && (
                                  <p className="text-xs text-stone-400 whitespace-nowrap">
                                    {quoteForm.rush_order
                                      ? `~${Math.max(Math.ceil(selectedRug.lead_time_days * 0.7), 7)} days`
                                      : `${selectedRug.lead_time_days} days`}
                                  </p>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Estimate button + result */}
                        <div className="space-y-3">
                          <button type="button" onClick={handleEstimate}
                            disabled={estimateLoading || !quoteForm.size_w || (quoteForm.shape !== 'circle' && !quoteForm.size_h)}
                            className="w-full flex items-center justify-center gap-2 border border-stone-200 hover:border-stone-500 text-stone-600 hover:text-stone-900 disabled:opacity-40 text-xs font-medium tracking-widest uppercase py-2.5 transition-colors"
                          >
                            {estimateLoading
                              ? <><div className="w-3.5 h-3.5 border border-stone-400 border-t-stone-900 rounded-full animate-spin" /> Calculating…</>
                              : <><Calculator size={13} /> Get Price Estimate</>}
                          </button>

                          {estimate && !estimateLoading && (
                            <div className="border border-stone-100 bg-stone-50 px-4 py-3 space-y-1.5">
                              <p className="text-stone-400 text-xs uppercase tracking-widest mb-2">Price Breakdown</p>

                              <div className="flex justify-between text-xs">
                                <span className="text-stone-400">
                                  {estimate.size_sqm.toFixed(2)} m² × {parseInt(quoteForm.qty) || 1} pc
                                </span>
                                <span className="text-stone-700">{fmtC(estimate.subtotal)}</span>
                              </div>

                              {estimate.bulk_discount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-green-600">Bulk discount</span>
                                  <span className="text-green-600">−{fmtC(estimate.bulk_discount)}</span>
                                </div>
                              )}

                              {estimate.rush_surcharge > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-amber-600">Early delivery surcharge</span>
                                  <span className="text-amber-600">+{fmtC(estimate.rush_surcharge)}</span>
                                </div>
                              )}

                              {estimate.size_surcharge > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-stone-500">Large format surcharge</span>
                                  <span className="text-stone-500">+{fmtC(estimate.size_surcharge)}</span>
                                </div>
                              )}

                              <div className="flex justify-between text-xs pt-1 border-t border-stone-200">
                                <span className="text-stone-400">Pre-tax</span>
                                <span className="text-stone-700">{fmtC(estimate.pre_gst_price)}</span>
                              </div>

                              <div className="flex justify-between text-xs">
                                <span className="text-stone-400">GST ({estimate.gst_pct.toFixed(0)}%)</span>
                                <span className="text-stone-700">+{fmtC(estimate.gst_amount)}</span>
                              </div>

                              <div className="flex justify-between text-sm font-medium pt-1.5 border-t border-stone-200">
                                <span className="text-stone-900">Total (incl. GST)</span>
                                <span className="text-stone-900">{fmtC(estimate.final_price)}</span>
                              </div>

                              {(parseInt(quoteForm.qty) || 1) > 1 && (
                                <p className="text-stone-400 text-xs pt-0.5">
                                  {fmtC(estimate.price_per_piece)} per piece · {estimate.estimated_days}d delivery
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right — contact */}
                      <div className="space-y-4">
                        {isCustomerAuthenticated && customer ? (
                          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2.5">
                            <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-stone-900 text-xs font-medium truncate">{customer.name}</p>
                              <p className="text-stone-400 text-xs truncate">{customer.email}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs uppercase tracking-widest text-stone-400 block">Your Name *</label>
                              <input name="name" value={quoteForm.name} onChange={handleQuoteChange}
                                placeholder="Full name" required
                                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs uppercase tracking-widest text-stone-400 block">Email *</label>
                              <input name="email" value={quoteForm.email} onChange={handleQuoteChange}
                                placeholder="you@example.com" type="email" required
                                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs uppercase tracking-widest text-stone-400 block">Phone</label>
                              <input name="phone" value={quoteForm.phone} onChange={handleQuoteChange}
                                placeholder="+91 98765 43210" type="tel"
                                className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors"
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs uppercase tracking-widest text-stone-400 block">Notes</label>
                          <textarea name="notes" value={quoteForm.notes} onChange={handleQuoteChange}
                            placeholder="Special requirements, colour preferences…" rows={3}
                            className="w-full border border-stone-200 focus:border-stone-400 px-3 py-2 text-stone-900 text-sm placeholder-stone-300 focus:outline-none transition-colors resize-none"
                          />
                        </div>

                        {quoteError && (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 text-red-600 text-xs">
                            <AlertTriangle size={12} className="flex-shrink-0" /> {quoteError}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button type="submit"
                            disabled={quoteSubmitting || !quoteForm.size_w || (quoteForm.shape !== 'circle' && !quoteForm.size_h) || (!isCustomerAuthenticated && (!quoteForm.name || !quoteForm.email))}
                            className="flex-1 border border-stone-300 hover:border-stone-600 text-stone-700 hover:text-stone-900 disabled:opacity-40 text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
                          >
                            {quoteSubmitting
                              ? <><div className="w-4 h-4 border border-stone-400 border-t-stone-900 rounded-full animate-spin" /> Submitting…</>
                              : <><Send size={13} /> Request Quote</>}
                          </button>
                          <button type="button"
                            onClick={handlePlaceOrder}
                            disabled={!quoteForm.size_w || (quoteForm.shape !== 'circle' && !quoteForm.size_h)}
                            className="flex-1 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-medium tracking-widest uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingBag size={13} /> Place Order
                          </button>
                        </div>
                        <p className="text-stone-400 text-xs text-center">Quote is free · Order goes straight to checkout</p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
      </div>
      {/* Lightbox */}
      {lightbox && resultImage && (
        <div className="fixed inset-0 z-50 bg-stone-900/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute top-4 right-4 bg-white hover:bg-stone-100 p-2 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={18} className="text-stone-700" />
          </button>
          <img src={resultImage} alt="Room with rug — full size"
            className="max-w-full max-h-full shadow-2xl"
            style={{ imageRendering: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </CustomerLayout>
  );
}

