import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart
} from 'recharts';
import {
  Activity, Calendar, ChevronLeft, ChevronRight, Home, LogOut, Plus,
  Scale, User as UserIcon, TrendingUp, Info, AlertCircle,
  Settings, CheckCircle2, Trash2, Edit2
} from 'lucide-react';
import { format, subDays, startOfToday, parseISO } from 'date-fns';
import { User, BMILog, getBMICategory, getBMICategoryColor } from './types';
import { cn } from './lib/utils';
import Swal from 'sweetalert2';

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-3xl border border-black/5 shadow-sm p-6", className)}>
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className,
  disabled,
  type = 'button'
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800",
    secondary: "bg-emerald-500 text-white hover:bg-emerald-600",
    outline: "border border-black/10 hover:bg-black/5",
    ghost: "hover:bg-black/5"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Input = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  suffix
}: {
  label: string;
  value: string | number;
  onChange: (val: any) => void;
  type?: string;
  placeholder?: string;
  suffix?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-black/40 ml-1">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 text-sm font-medium">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<BMILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  // Profile Form State
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState(user?.activity_level || 'moderate');

  // Entry Form State
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const savedUser = localStorage.getItem('vitaltrack_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // Pre-fill forms from local data
      if (parsedUser.height) setHeight(parsedUser.height.toString());
      if (parsedUser.age) setAge(parsedUser.age.toString());
      if (parsedUser.gender) setGender(parsedUser.gender);
      if (parsedUser.activity_level) setActivityLevel(parsedUser.activity_level);

      if (!parsedUser.height) {
        setShowProfileSetup(true);
      }

      fetchUserProfile(parsedUser.id);
    } else {
      setLoading(false);
    }

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const userData = event.data.user;
        localStorage.setItem('vitaltrack_user', JSON.stringify(userData));
        fetchUserProfile(userData.id);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('vitaltrack_user', JSON.stringify(data));

        // Update form states
        if (data.height) setHeight(data.height.toString());
        if (data.age) setAge(data.age.toString());
        if (data.gender) setGender(data.gender);
        if (data.activity_level) setActivityLevel(data.activity_level);

        if (!data.height) {
          setShowProfileSetup(true);
        } else {
          fetchLogs(userId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (userId: string) => {
    try {
      const res = await fetch(`/api/logs/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.open(url, 'google_auth', 'width=500,height=600');
  };

  const handleGuestLogin = async () => {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 11);
    const guestUser = {
      id: guestId,
      name: 'Guest User',
      email: `${guestId}@vitaltrack.local`
    };

    // Register guest in backend so we can save logs
    try {
      await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestUser)
      });

      localStorage.setItem('vitaltrack_user', JSON.stringify(guestUser));
      setUser(guestUser as User);
      setShowProfileSetup(true);
    } catch (err) {
      console.error("Guest login failed", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vitaltrack_user');
    setUser(null);
    setLogs([]);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const h = parseFloat(height);
    const a = parseInt(age);

    if (isNaN(h) || isNaN(a)) {
      Swal.fire({
        title: 'Invalid Input',
        text: 'Please enter valid numbers for height and age.',
        icon: 'error',
        confirmButtonColor: '#000',
        customClass: {
          popup: 'rounded-[1.5rem]',
          confirmButton: 'rounded-xl px-6 py-2'
        }
      });
      return;
    }

    try {
      const res = await fetch(`/api/user/${user.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: h,
          age: a,
          gender,
          activity_level: activityLevel
        })
      });

      if (res.ok) {
        const updatedUser = { ...user, height: parseFloat(height), age: parseInt(age), gender, activity_level: activityLevel };
        setUser(updatedUser);
        localStorage.setItem('vitaltrack_user', JSON.stringify(updatedUser));
        setShowProfileSetup(false);
        fetchLogs(user.id);

        Swal.fire({
          title: 'Profile Updated!',
          text: 'Your lifestyle metrics have been saved.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.height) {
      Swal.fire({
        title: 'Profile Incomplete',
        text: 'Please complete your profile first.',
        icon: 'warning',
        confirmButtonColor: '#000',
        customClass: {
          popup: 'rounded-[1.5rem]',
          confirmButton: 'rounded-xl px-6 py-2'
        }
      });
      return;
    }

    if (!weight || !date) {
      Swal.fire({
        title: 'Missing Info',
        text: 'Please enter both weight and date.',
        icon: 'warning',
        confirmButtonColor: '#000',
        customClass: {
          popup: 'rounded-[1.5rem]',
          confirmButton: 'rounded-xl px-6 py-2'
        }
      });
      return;
    }

    const hInM = user.height / 100;
    const w = parseFloat(weight);
    const bmi = w / (hInM * hInM);

    try {
      const res = await fetch(`/api/logs/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: w, bmi: parseFloat(bmi.toFixed(1)), date })
      });

      if (res.ok) {
        setShowEntryModal(false);
        fetchLogs(user.id);
        setWeight('');

        Swal.fire({
          title: 'Entry Saved',
          text: 'Your weight log has been updated.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLog = async (logId: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#000',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-[1.5rem]',
        confirmButton: 'rounded-xl px-6 py-2',
        cancelButton: 'rounded-xl px-6 py-2'
      }
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: 'DELETE'
      });

      if (res.ok && user) {
        fetchLogs(user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoHome = () => {
    setShowProfileSetup(false);
    setShowEntryModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4"
        >
          <Activity className="w-12 h-12 text-black" />
          <p className="font-medium text-black/40 uppercase tracking-widest text-xs">Initializing VitalTrack</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-black rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-black/20">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-black">VitalTrack</h1>
            <p className="text-black/60 text-lg">Precision BMI tracking for your health journey.</p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleLogin} className="w-full py-4 text-lg rounded-2xl">
              Continue with Google
            </Button>
            <Button onClick={handleGuestLogin} variant="outline" className="w-full py-4 text-lg rounded-2xl">
              Try as Guest
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8">
            {[
              { icon: TrendingUp, label: 'Trends' },
              { icon: Scale, label: 'Weight' },
              { icon: CheckCircle2, label: 'Goals' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-black/40" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
        <Card className="max-w-md w-full space-y-8 relative">
          {user.height && (
            <button
              onClick={() => setShowProfileSetup(false)}
              className="absolute right-6 top-6 p-2 hover:bg-black/5 rounded-full"
            >
              <LogOut className="w-5 h-5 rotate-90 text-black/40" />
            </button>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <p className="text-black/60">Update your details to keep your BMI calculations accurate.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowProfileSetup(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-black/5 text-black/60 transition-all font-medium text-sm border border-black/5"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Height" value={height} onChange={setHeight} type="number" suffix="cm" placeholder="175" />
              <Input label="Age" value={age} onChange={setAge} type="number" placeholder="25" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-black/40 ml-1">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn(
                      "py-3 rounded-xl font-medium capitalize transition-all",
                      gender === g ? "bg-black text-white" : "bg-black/5 text-black/60 hover:bg-black/10"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-black/40 ml-1">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-black/5 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-black outline-none transition-all appearance-none"
              >
                <option value="sedentary">Sedentary</option>
                <option value="moderate">Moderate</option>
                <option value="active">Very Active</option>
              </select>
            </div>

            <Button type="submit" className="w-full py-4 rounded-2xl">
              Save Profile
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const category = latestLog ? getBMICategory(latestLog.bmi) : null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24">
      {/* Header */}
      <header className="bg-white border-bottom border-black/5 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left outline-none"
          >
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight leading-none text-black">VitalTrack</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Health Dashboard</p>
            </div>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoHome}
              className="p-2 hover:bg-black/5 rounded-xl transition-all text-black/40 hover:text-black"
              title="Home"
            >
              <Home className="w-5 h-5" />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none">{user.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/40">Premium User</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-black/5 rounded-xl transition-all">
              <LogOut className="w-5 h-5 text-black/40" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Current BMI</span>
                <Info className="w-4 h-4 text-black/20" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tighter">{latestLog?.bmi || '--'}</span>
                <span className="text-sm font-bold text-black/40">kg/m²</span>
              </div>
              {category && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getBMICategoryColor(category) }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: getBMICategoryColor(category) }}>
                    {category}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-32 h-32 text-black" />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Latest Weight</span>
              <Scale className="w-4 h-4 text-black/20" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tighter">{latestLog?.weight || '--'}</span>
              <span className="text-sm font-bold text-black/40">kg</span>
            </div>
            <div className="flex items-center gap-2 text-black/40">
              <Calendar className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {latestLog ? format(parseISO(latestLog.date), 'MMM dd, yyyy') : 'No data'}
              </span>
            </div>
          </Card>

          <Card className="bg-black text-white border-none shadow-xl shadow-black/20 flex flex-col justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Persona Profile</p>
              <h3 className="text-xl font-bold">{user.height}cm • {user.age}y</h3>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white/40" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowProfileSetup(true)}
                  className="text-white/60 hover:bg-white/10 hover:text-white p-2"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  <span className="text-xs">Profile</span>
                </Button>
                <Button variant="ghost" className="text-white/60 hover:bg-white/10 hover:text-white p-2">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Chart Section */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">BMI Trend Analysis</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-black/40">Last 30 Days</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Normal Range</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full p-6">
            {logs.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={logs}>
                  <defs>
                    <linearGradient id="colorBmi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#00000040' }}
                    tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                  />
                  <YAxis
                    domain={[15, 35]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#00000040' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 700, marginBottom: '4px' }}
                    labelFormatter={(label) => format(parseISO(label), 'MMMM dd, yyyy')}
                  />
                  <ReferenceLine y={18.5} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'right', value: '18.5', fill: '#3b82f6', fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={24.9} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: '24.9', fill: '#10b981', fontSize: 10, fontWeight: 700 }} />
                  <ReferenceLine y={29.9} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'right', value: '29.9', fill: '#f59e0b', fontSize: 10, fontWeight: 700 }} />
                  <Area
                    type="monotone"
                    dataKey="bmi"
                    stroke="#000"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorBmi)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-black/20 gap-4">
                <TrendingUp className="w-12 h-12" />
                <p className="font-bold uppercase tracking-widest text-xs">No data available for analysis</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Logs Table */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-black/5">
            <h3 className="text-lg font-bold">Historical Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Weight</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">BMI</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {logs.slice().reverse().map((log) => {
                  const cat = getBMICategory(log.bmi);
                  return (
                    <tr key={log.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-sm">{format(parseISO(log.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 font-bold text-sm">{log.weight} kg</td>
                      <td className="px-6 py-4 font-bold text-sm">{log.bmi}</td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: `${getBMICategoryColor(cat)}20`, color: getBMICategoryColor(cat) }}
                        >
                          {cat}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 hover:bg-red-50 text-black/20 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-black/40 font-medium">
                      Your weight history will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
        <Button
          onClick={() => setShowEntryModal(true)}
          className="h-14 px-8 rounded-[2rem] shadow-2xl shadow-black/40 text-lg"
        >
          <Plus className="w-6 h-6" />
          Log Weight
        </Button>
      </div>

      {/* Entry Modal */}
      <AnimatePresence>
        {showEntryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEntryModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm"
            >
              <Card className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Daily Entry</h3>
                  <button onClick={() => setShowEntryModal(false)} className="p-2 hover:bg-black/5 rounded-full">
                    <LogOut className="w-5 h-5 rotate-90 text-black/40" />
                  </button>
                </div>

                <form onSubmit={handleLogSubmit} className="space-y-6">
                  <Input
                    label="Weight"
                    value={weight}
                    onChange={setWeight}
                    type="number"
                    suffix="kg"
                    placeholder="70.5"
                  />
                  <Input
                    label="Date"
                    value={date}
                    onChange={setDate}
                    type="date"
                  />

                  <div className="pt-2">
                    <Button type="submit" className="w-full py-4 rounded-2xl">
                      Confirm Entry
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
