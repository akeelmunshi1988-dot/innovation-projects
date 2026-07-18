import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import {
  CheckCircle, Package, Truck, Clock, MapPin, ArrowRight, Search,
} from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import type { CheckoutResponse } from '../services/api';
import { fmtExact, currencySymbol } from '../utils/currency';

const STATUS_STEPS = [
  { key: 'pending',       label: 'Order Placed',     desc: 'Awaiting production confirmation' },
  { key: 'confirmed',     label: 'Confirmed',         desc: 'Production scheduled' },
  { key: 'in_production', label: 'In Production',     desc: 'Craftsmen at work' },
  { key: 'shipped',       label: 'Shipped',           desc: 'On its way to you' },
  { key: 'delivered',     label: 'Delivered',         desc: 'Enjoy your rug!' },
];

export default function CustomerOrderConfirm() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const order = location.state as CheckoutResponse | null;

  const currency = order?.price_currency ?? 'INR';
  const sym = currencySymbol(currency);
  const fmt = (n: number) => fmtExact(n, currency);

  const currentStep = STATUS_STEPS.findIndex((s) => s.key === (order?.status ?? 'pending'));
  const activeIdx = currentStep === -1 ? 0 : currentStep;

  if (!order) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-5 py-24 text-center space-y-4">
          <Package size={48} className="text-dark-600 mx-auto" />
          <h2 className="text-dark-900 font-bold text-xl">Order #{id}</h2>
          <p className="text-dark-400 text-sm">
            Use your email to look up your orders and track status.
          </p>
          <Link
            to="/shop/my-orders"
            className="inline-flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            <Search size={15} /> Track My Orders
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-5 py-12 space-y-6">
        {/* Success banner */}
        <div className="bg-green-900/15 border border-green-700/30 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle size={48} className="text-green-400 mx-auto" />
          <h1 className="text-dark-900 font-bold text-2xl">Order Placed!</h1>
          <p className="text-dark-600 text-sm">
            Order <span className="text-dark-900 font-semibold">#{order.order_id}</span> has been received.
            Our team will call/WhatsApp you to confirm production details and payment.
          </p>
        </div>

        {/* Order details */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
          <div className="bg-dark-800 px-5 py-4 border-b border-dark-700 flex items-center gap-2">
            <Package size={15} className="text-gold-400" />
            <h2 className="text-cream-100 font-semibold text-sm">Order Details</h2>
            <span className="ml-auto text-xs bg-amber-900/30 text-amber-300 border border-amber-700/30 px-2 py-0.5 rounded-full capitalize">
              {order.status}
            </span>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Rug</p>
              <p className="text-cream-200 font-medium">{order.rug_name}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Size</p>
              <p className="text-cream-200">{order.size}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Quantity</p>
              <p className="text-cream-200">{order.qty} piece{order.qty !== 1 ? 's' : ''}</p>
            </div>
            {order.pre_gst_price != null && (
              <div>
                <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Pre-tax</p>
                <p className="text-cream-200">{fmt(order.pre_gst_price)}</p>
              </div>
            )}
            {order.gst_amount != null && (
              <div>
                <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">GST ({order.gst_pct?.toFixed(0)}%)</p>
                <p className="text-blue-300">+{fmt(order.gst_amount)}</p>
              </div>
            )}
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Total (incl. GST)</p>
              <p className="text-gold-400 font-bold text-base">{fmt(order.final_price)}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Est. Delivery</p>
              <p className="text-cream-200 flex items-center gap-1">
                <Truck size={12} className="text-dark-400" />
                {order.estimated_delivery}
              </p>
            </div>
            <div>
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">Lead Time</p>
              <p className="text-cream-200 flex items-center gap-1">
                <Clock size={12} className="text-dark-400" />
                ~{order.lead_time_days} days
              </p>
            </div>
          </div>
          {order.shipping_address && (
            <div className="px-5 pb-5">
              <p className="text-dark-500 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin size={11} /> Deliver To
              </p>
              <p className="text-cream-300 text-sm whitespace-pre-line">{order.shipping_address}</p>
            </div>
          )}
        </div>

        {/* Status tracker */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
          <div className="bg-dark-800 px-5 py-4 border-b border-dark-700">
            <h2 className="text-cream-100 font-semibold text-sm">Order Progress</h2>
          </div>
          <div className="p-5">
            <ol className="relative border-l border-dark-700 ml-3 space-y-5">
              {STATUS_STEPS.map((step, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                  <li key={step.key} className="ml-5">
                    <span
                      className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${done ? 'bg-green-500 border-green-500' : active ? 'bg-gold-600 border-gold-600' : 'bg-dark-800 border-dark-600'}`}
                    />
                    <p className={`text-sm font-semibold ${active ? 'text-gold-400' : done ? 'text-green-400' : 'text-dark-500'}`}>
                      {step.label}
                    </p>
                    <p className="text-dark-500 text-xs mt-0.5">{step.desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/shop/my-orders"
            className="flex-1 flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-cream-200 font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Search size={15} /> Track Orders by Email
          </Link>
          <Link
            to="/shop/catalog"
            className="flex-1 flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Continue Shopping <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
