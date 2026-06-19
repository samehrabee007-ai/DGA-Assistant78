import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, AlertCircle, Info, BookOpen } from 'lucide-react';

export default function Thresholds() {
  const [thresholds, setThresholds] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultThresholds = [
    { gas: "H2", lo90: 80, lo95: 200, hi90: 40, hi95: 90 },
    { gas: "CH4", lo90: 90, lo95: 150, hi90: 20, hi95: 50 },
    { gas: "C2H6", lo90: 90, lo95: 175, hi90: 15, hi95: 40 },
    { gas: "C2H4", lo90: 50, lo95: 100, hi90: 50, hi95: 100 },
    { gas: "C2H2", lo90: 1, lo95: 2, hi90: 2, hi95: 7 },
    { gas: "CO", lo90: 900, lo95: 1100, hi90: 500, hi95: 600 },
    { gas: "CO2", lo90: 9000, lo95: 12500, hi90: 5000, hi95: 7000 }
  ];

  useEffect(() => {
    axios.get('https://dga-backend-4d39.onrender.com/api/thresholds').then(res => {
      if (res.data.length > 0) {
        setThresholds(res.data);
      } else {
        setThresholds(defaultThresholds);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (index, field, value) => {
    const newThr = [...thresholds];
    newThr[index][field] = parseFloat(value) || 0;
    setThresholds(newThr);
  };

  const handleSave = async () => {
    try {
      await axios.post('https://dga-backend-4d39.onrender.com/api/thresholds/bulk', { thresholds });
      alert('تم حفظ الإعدادات بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الحفظ.');
    }
  };

  return (
    <div className="space-y-8 pb-12 font-sans" dir="rtl">
      <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4" dir="ltr">
        <button onClick={handleSave} className="btn-primary flex justify-center items-center gap-2 w-full sm:w-auto">
           حفظ التعديلات <Save size={18} />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">IEEE 2019 & Thresholds</h1>
      </div>

      {/* Editable Thresholds Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon /> إعدادات النظام (قابل للتعديل بواسطة الإدارة)
        </h2>
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl flex items-start gap-3" dir="rtl">
          <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold">تنبيه هام</p>
            <p className="text-sm mt-1">هذه هي القيم المبدئية التي يستخدمها النظام لتقييم الـ Screening Limits. يمكنك تعديلها في أي وقت، وسيتم تطبيقها على جميع التحاليل.</p>
          </div>
        </div>

        <div className="glass-panel overflow-hidden" dir="ltr">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Gas</th>
                <th className="p-4 font-semibold text-slate-600">90th (O2/N2 &le; 0.2)</th>
                <th className="p-4 font-semibold text-slate-600">95th (O2/N2 &le; 0.2)</th>
                <th className="p-4 font-semibold text-slate-600">90th (O2/N2 &gt; 0.2)</th>
                <th className="p-4 font-semibold text-slate-600">95th (O2/N2 &gt; 0.2)</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((thr, idx) => (
                <tr key={thr.gas} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-primary">{thr.gas}</td>
                  <td className="p-4"><input type="number" className="w-24 p-2 border border-slate-300 rounded outline-none focus:border-primary" value={thr.lo90} onChange={(e) => handleChange(idx, 'lo90', e.target.value)} /></td>
                  <td className="p-4"><input type="number" className="w-24 p-2 border border-slate-300 rounded outline-none focus:border-primary" value={thr.lo95} onChange={(e) => handleChange(idx, 'lo95', e.target.value)} /></td>
                  <td className="p-4"><input type="number" className="w-24 p-2 border border-slate-300 rounded outline-none focus:border-primary" value={thr.hi90} onChange={(e) => handleChange(idx, 'hi90', e.target.value)} /></td>
                  <td className="p-4"><input type="number" className="w-24 p-2 border border-slate-300 rounded outline-none focus:border-primary" value={thr.hi95} onChange={(e) => handleChange(idx, 'hi95', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* IEEE Reference Section */}
      <section className="space-y-6 mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen /> المرجعية القياسية (IEEE C57.104-2019)
        </h2>
        
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl flex items-start gap-3">
          <Info className="mt-0.5 flex-shrink-0" size={20} />
          <div className="text-sm space-y-1">
            <p className="font-semibold">ملاحظة هامة جداً:</p>
            <p>الجداول التالية هي <strong>Screening Limits based on IEEE C57.104-2019 O₂/N₂ Interpretation</strong> وليست Condition Limits الرسمية. النظام يستخدم هذه الجداول جنباً إلى جنب مع Condition Limits المعتمدة للحصول على التقييم النهائي الأمثل للغازات.</p>
          </div>
        </div>

        {/* Screening Table */}
        <div>
          <h3 className="text-xl font-bold text-slate-700 mb-4">1. جدول حدود التقييم المبدئي (Screening Limits)</h3>
          <div className="glass-panel overflow-hidden" dir="ltr">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3">O₂/N₂ Ratio</th>
                  <th className="p-3">CO</th>
                  <th className="p-3">CH₄</th>
                  <th className="p-3">C₂H₂</th>
                  <th className="p-3">C₂H₆</th>
                  <th className="p-3">C₂H₄</th>
                  <th className="p-3">CO₂</th>
                  <th className="p-3">H₂</th>
                  <th className="p-3">التقييم</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                <tr className="border-b border-slate-200 bg-green-50">
                  <td className="p-3">&lt; 0.20</td>
                  <td className="p-3">900</td>
                  <td className="p-3">90</td>
                  <td className="p-3">1</td>
                  <td className="p-3">90</td>
                  <td className="p-3">50</td>
                  <td className="p-3">9000</td>
                  <td className="p-3">80</td>
                  <td className="p-3 font-bold text-green-700 font-sans">Normal Range</td>
                </tr>
                <tr className="border-b border-slate-200 bg-yellow-50">
                  <td className="p-3">&lt; 0.20</td>
                  <td className="p-3">1100</td>
                  <td className="p-3">150</td>
                  <td className="p-3">2</td>
                  <td className="p-3">175</td>
                  <td className="p-3">100</td>
                  <td className="p-3">12500</td>
                  <td className="p-3">200</td>
                  <td className="p-3 font-bold text-yellow-700 font-sans">Upper Normal Limit</td>
                </tr>
                <tr className="border-b border-slate-200 bg-orange-50">
                  <td className="p-3">&ge; 0.20</td>
                  <td className="p-3">500</td>
                  <td className="p-3">20</td>
                  <td className="p-3">2</td>
                  <td className="p-3">15</td>
                  <td className="p-3">50</td>
                  <td className="p-3">5000</td>
                  <td className="p-3">40</td>
                  <td className="p-3 font-bold text-orange-700 font-sans">Air Ingress Monitoring</td>
                </tr>
                <tr className="bg-red-50">
                  <td className="p-3">&ge; 0.20</td>
                  <td className="p-3">600</td>
                  <td className="p-3">50</td>
                  <td className="p-3">7</td>
                  <td className="p-3">40</td>
                  <td className="p-3">100</td>
                  <td className="p-3">7000</td>
                  <td className="p-3">90</td>
                  <td className="p-3 font-bold text-red-700 font-sans">Warning Level</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* O2/N2 Interpretation */}
          <div>
            <h3 className="text-xl font-bold text-slate-700 mb-4">2. تفسير نسبة O₂/N₂</h3>
            <div className="glass-panel overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-3 border-b">النسبة</th>
                    <th className="p-3 border-b">التفسير</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-slate-100"><td className="p-3 font-mono" dir="ltr">&lt; 0.20</td><td className="p-3">المحول غالبًا محكم الغلق (Sealed Transformer)</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-3 font-mono" dir="ltr">0.20 – 0.30</td><td className="p-3">احتمال دخول هواء بسيط</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-3 font-mono" dir="ltr">0.30 – 0.50</td><td className="p-3">مراقبة دقيقة</td></tr>
                  <tr><td className="p-3 font-mono" dir="ltr">&gt; 0.50</td><td className="p-3">اشتباه Air Ingress أو تسريب</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Condition Limits */}
          <div>
            <h3 className="text-xl font-bold text-slate-700 mb-4">3. حدود IEEE الأساسية (Condition Limits)</h3>
            <div className="glass-panel overflow-hidden" dir="ltr">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm">
                    <th className="p-2 border-b">Gas</th>
                    <th className="p-2 border-b">Cond.1</th>
                    <th className="p-2 border-b">Cond.2</th>
                    <th className="p-2 border-b">Cond.3</th>
                    <th className="p-2 border-b">Cond.4</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">H₂</td><td className="p-2">100</td><td className="p-2">700</td><td className="p-2">1800</td><td className="p-2 text-red-600">&gt;1800</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">CH₄</td><td className="p-2">120</td><td className="p-2">400</td><td className="p-2">1000</td><td className="p-2 text-red-600">&gt;1000</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">C₂H₂</td><td className="p-2">1</td><td className="p-2">9</td><td className="p-2">35</td><td className="p-2 text-red-600">&gt;35</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">C₂H₄</td><td className="p-2">50</td><td className="p-2">100</td><td className="p-2">200</td><td className="p-2 text-red-600">&gt;200</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">C₂H₆</td><td className="p-2">65</td><td className="p-2">100</td><td className="p-2">150</td><td className="p-2 text-red-600">&gt;150</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">CO</td><td className="p-2">350</td><td className="p-2">570</td><td className="p-2">1400</td><td className="p-2 text-red-600">&gt;1400</td></tr>
                  <tr className="border-b border-slate-100"><td className="p-2 font-bold">CO₂</td><td className="p-2">2500</td><td className="p-2">4000</td><td className="p-2">10000</td><td className="p-2 text-red-600">&gt;10000</td></tr>
                  <tr><td className="p-2 font-bold">TDCG</td><td className="p-2">720</td><td className="p-2">1920</td><td className="p-2">4630</td><td className="p-2 text-red-600">&gt;4630</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Final Logic Note */}
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg mt-8 border-l-4 border-primary">
          <h3 className="text-xl font-bold mb-3 text-primary-light">منطق البرنامج الداخلي والتوصية الهندسية</h3>
          <p className="mb-4 text-slate-300">النظام يقوم بحساب النسبة تلقائياً، ويحدد جدول المقارنة المناسب، ثم يُجري فحصاً شاملاً يعتمد على المعادلة التالية لضمان أعلى درجات الأمان وعدم إخفاء أي عطل:</p>
          <div className="bg-slate-900 p-4 rounded-lg font-mono text-sm text-green-400" dir="ltr">
            Final Condition = MAX(<br/>
            &nbsp;&nbsp;O2/N2 Assessment,<br/>
            &nbsp;&nbsp;IEEE Gas Condition,<br/>
            &nbsp;&nbsp;TDCG Condition<br/>
            )
          </div>
          <p className="mt-4 text-slate-300 text-sm">إذا كان أي معيار يعطي تحذيراً (Warning) أو حالة حرجة (Critical)، يتم رفع التقييم العام للمحول بالكامل لتنبيه المهندس.</p>
        </div>

      </section>
    </div>
  );
}

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
