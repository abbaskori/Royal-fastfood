import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Delete, ChevronRight, Fingerprint } from "lucide-react";
import { useSecuritySettings } from "@/hooks/use-data";

interface LoginProps {
  onLogin: (role: 'admin' | 'staff' | 'manager') => void;
}

export default function LoginPage({ onLogin }: LoginProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const { data: security } = useSecuritySettings();

  const handleKeyPress = (val: string) => {
    if (pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = (inputPin: string) => {
    if (inputPin === security.adminPin) {
      onLogin('admin');
    } else if (inputPin === security.staffPin) {
      onLogin('staff');
    } else if (inputPin === security.managerPin) {
      onLogin('manager');
    } else {
      setError(true);
      setTimeout(() => {
        setPin("");
        setError(false);
      }, 1000);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[100]">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8 text-center"
      >
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-yellow-500 to-yellow-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-yellow-500/20 mb-6">
            <Lock className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-display font-black text-white mb-2">Royal POS</h1>
          <p className="text-slate-400 font-medium">Enter your 4-digit PIN to unlock</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-4 mb-12">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i 
                  ? "bg-white border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                  : "border-slate-700 bg-transparent"
              } ${error ? "border-red-500 bg-red-500" : ""}`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <KeyButton key={num} onClick={() => handleKeyPress(num.toString())} label={num.toString()} />
          ))}
          <div /> {/* Empty space */}
          <KeyButton onClick={() => handleKeyPress("0")} label="0" />
          <button 
            onClick={handleDelete}
            className="h-16 flex items-center justify-center rounded-2xl bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-8">
          <button className="text-slate-500 hover:text-slate-300 text-sm font-bold flex items-center gap-2 mx-auto transition-colors">
            <Fingerprint className="w-4 h-4" /> Forgot PIN? Contact Admin
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function KeyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-16 text-2xl font-black text-white bg-slate-900/50 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all border border-slate-800/50"
    >
      {label}
    </button>
  );
}
