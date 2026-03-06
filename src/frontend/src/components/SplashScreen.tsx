import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 400);
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ backgroundColor: "#FF4500" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        >
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.2) 0%, transparent 50%)",
            }}
          />

          {/* Logo content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            {/* Chapel Icon */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 2.5,
                ease: "easeInOut",
              }}
              className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-2xl"
            >
              <img
                src="/assets/generated/chapel-icon-transparent.dim_512x512.png"
                alt="Old Chapel Studios"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Logo Text */}
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span
                  className="text-4xl font-black tracking-tight leading-none"
                  style={{
                    fontFamily: "'Outfit', 'General Sans', sans-serif",
                    color: "#1a0a00",
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  Old Chapel
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span
                  className="text-2xl font-bold tracking-wide"
                  style={{
                    fontFamily: "'Outfit', 'General Sans', sans-serif",
                    color: "white",
                    letterSpacing: "0.05em",
                  }}
                >
                  STUDIOS APP
                </span>
              </div>
            </div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-white/80 text-sm font-medium tracking-widest uppercase"
              style={{ fontFamily: "'General Sans', sans-serif" }}
            >
              Your Private Music Community Hub
            </motion.p>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex gap-1.5 mt-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/60"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 1.2,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Leeds tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-12 text-white/50 text-xs tracking-widest uppercase"
          >
            Leeds, UK
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
