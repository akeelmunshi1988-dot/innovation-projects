import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import {
  CheckCircle, Package, Truck, Clock, MapPin, ArrowRight, Search,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { getPublicSettings } from '../services/api';
import type { CheckoutResponse } from '../services/api';
import { fmtExact } from '../utils/currency';
import { fmtDims } from '../utils/size';

const STATUS_STEPS = [
  { key: 'pending',       label: 'Order Placed',   desc: 'Awaiting production confirmation' },
  { key: 'confirmed',     label: 'Confirmed',       desc: 'Production scheduled' },
  { key: 'in_production', label: 'In Production',   desc: 'Craftsmen at work' },
  { key: 'shipped',       label: 'Shipped',         desc: 'On its way to you' },
  { key: 'delivered',     label: 'Delivered',       desc: 'Enjoy your rug!' },
];

export default function CustomerOrderConfirm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const order = location.state as CheckoutResponse | null;

  const [sizeUnit, setSizeUnit] = useState('ft');
  useEffect(() => {
    getPublicSettings().then((data) => setSizeUnit(data.default_size_unit || 'ft')).catch(() => {});
  }, []);

  const currency = order?.price_currency ?? 'INR';
  const fmt = (n: number) => fmtExact(n, currency);

  const currentStep = STATUS_STEPS.findIndex((s) => s.key === (order?.status ?? 'pending'));
  const activeIdx = currentStep === -1 ? 0 : currentStep;

  if (!order) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-6 py-32 text-center space-y-4">
          <Package size={36} className="text-stone-300 mx-auto" />
          <h2 className="font-serif text-2xl font-light text-stone-900">Order #{id}</h2>
          <p className="text-stone-500 text-sm">Use your email to look up your orders and track status.</p>
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase px-6 py-3 transition-colors"
          >
            <Search size={13} /> Track My Orders
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">

        {/* Success banner */}
        <div className="border border-green-200 bg-green-50 p-10 text-center space-y-3">
          <CheckCircle size={44} className="text-green-600 mx-auto" />
          <h1 className="font-serif text-4xl font-light text-stone-900">Order Placed</h1>
          <p className="text-stone-500 text-sm leading-relaxed max-w-sm mx-auto">
            Order <span className="text-stone-900 font-medium">#{order.order_id}</span> has been received.
            Our team will call / WhatsApp you to confirm production details and payment.
          </p>
        </div>

        {/* Order details */}
        <div className="border border-stone-200">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
            <Package size={14} className="text-stone-400" />
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Order Details</p>
            <span className="ml-auto text-xs border border-stone-200 text-stone-500 px-2 py-0.5 capitalize">
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Rug</p>
              <p className="text-stone-900 font-medium">{order.rug_name}</p>
            </div>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Size</p>
              <p className="text-stone-700">{fmtDims(order.size_w, order.size_h, sizeUnit, order.shape)}</p>
            </div>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Quantity</p>
              <p className="text-stone-700">{order.qty} piece{order.qty !== 1 ? 's' : ''}</p>
            </div>
            {order.pre_gst_price != null && (
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Pre-tax</p>
                <p className="text-stone-700">{fmt(order.pre_gst_price)}</p>
              </div>
            )}
            {order.gst_amount != null && (
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">GST ({order.gst_pct?.toFixed(0)}%)</p>
                <p className="text-stone-700">+{fmt(order.gst_amount)}</p>
              </div>
            )}
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Total (incl. GST)</p>
              <p className="text-stone-900 font-medium text-base">{fmt(order.final_price)}</p>
            </div>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Delivery Date</p>
              <p className="text-stone-700 flex items-center gap-1">
                <Truck size={12} className="text-stone-400" />
                {order.estimated_delivery}
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">Expected Delivery</p>
              <p className="text-stone-700 flex items-center gap-1">
                <Clock size={12} className="text-stone-400" />
                ~{order.lead_time_days} days
              </p>
            </div>
          </div>
          {order.shipping_address && (
            <div className="px-5 pb-5 border-t border-stone-100 pt-4">
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1.5 flex items-center gap-1">
                <MapPin size={11} /> Deliver To
              </p>
              <p className="text-stone-600 text-sm leading-relaxed">{order.shipping_address}</p>
            </div>
          )}
        </div>

        {/* Status tracker */}
        <div className="border border-stone-200">
          <div className="px-5 py-4 border-b border-stone-100">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-400">Order Progress</p>
          </div>
          <div className="p-5">
            <ol className="relative border-l border-stone-200 ml-3 space-y-5">
              {STATUS_STEPS.map((step, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                  <li key={step.key} className="ml-5">
                    <span className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${done ? 'bg-green-500 border-green-500' : active ? 'bg-stone-900 border-stone-900' : 'bg-white border-stone-300'}`}
                    />
                    <p className={`text-sm font-medium ${active ? 'text-stone-900' : done ? 'text-green-600' : 'text-stone-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-stone-400 text-xs mt-0.5">{step.desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/my-orders"
            className="flex-1 flex items-center justify-center gap-2 border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 text-xs font-medium tracking-widest uppercase py-4 transition-colors"
          >
            <Search size={13} /> Track Orders
          </Link>
          <Link
            to="/catalog"
            className="flex-1 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium tracking-widest uppercase py-4 transition-colors"
          >
            Continue Shopping <ArrowRight size={13} />
          </Link>
        </div>

      </div>
    </CustomerLayout>
  );
}
