/**
 * ExpenseFlow - Custom Animation System
 * Advanced animation engine with micro-interactions, particle effects, and stunning visuals
 * 
 * Features:
 * - Custom animation hooks for reusable logic
 * - Particle system for celebrations and effects
 * - Gesture-based interactions
 * - 3D transforms and perspective effects
 * - Loading animations with creative designs
 * - Success/error animations with confetti
 * - Scroll-triggered animations
 * - Performance-optimized rendering
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, useAnimation, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// ==================== CUSTOM ANIMATION HOOKS ====================

/**
 * Hook for animated number counting
 * Creates smooth number transitions with easing
 */
export const useCountAnimation = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const frameRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(start + (end - start) * easeOutQuart));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, start]);

  return count;
};

/**
 * Hook for scroll-triggered animations
 * Triggers animations when element enters viewport
 */
export const useScrollAnimation = (threshold = 0.1) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return [ref, controls];
};

/**
 * Hook for parallax scroll effects
 * Creates depth with different scroll speeds
 */
export const useParallax = (speed = 0.5) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.pageYOffset * speed);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offset;
};

/**
 * Hook for mouse tracking
 * Tracks mouse position for interactive effects
 */
export const useMousePosition = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
};

/**
 * Hook for gesture-based animations
 * Handles drag, swipe, and tap gestures
 */
export const useGesture = (onSwipe) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleDragStart = (event, info) => {
    setIsDragging(true);
    startPos.current = { x: info.point.x, y: info.point.y };
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const deltaX = info.point.x - startPos.current.x;
    const deltaY = info.point.y - startPos.current.y;

    if (Math.abs(deltaX) > 100) {
      onSwipe?.(deltaX > 0 ? 'right' : 'left');
    } else if (Math.abs(deltaY) > 100) {
      onSwipe?.(deltaY > 0 ? 'down' : 'up');
    }
  };

  return { isDragging, handleDragStart, handleDragEnd };
};

// ==================== PARTICLE SYSTEM ====================

/**
 * Particle component for visual effects
 * Used in celebrations, success animations, etc.
 */
const Particle = ({ x, y, color, size, duration, delay }) => {
  const randomX = useMemo(() => (Math.random() - 0.5) * 200, []);
  const randomY = useMemo(() => (Math.random() - 0.5) * 200, []);

  return (
    <motion.div
      initial={{ x, y, opacity: 1, scale: 1 }}
      animate={{
        x: x + randomX,
        y: y + randomY,
        opacity: 0,
        scale: 0
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut'
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        pointerEvents: 'none'
      }}
    />
  );
};

/**
 * Particle system for celebrations and effects
 * Creates burst of particles with customizable properties
 */
export const ParticleSystem = ({ 
  active, 
  x = 0, 
  y = 0, 
  count = 30, 
  colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'],
  onComplete 
}) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        duration: Math.random() * 1 + 0.5,
        delay: Math.random() * 0.2
      }));

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [active, x, y, count, colors, onComplete]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </div>
  );
};

// ==================== CONFETTI ANIMATION ====================

/**
 * Confetti animation for success celebrations
 * Creates falling confetti with physics
 */
export const ConfettiAnimation = ({ active, duration = 3000 }) => {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (active) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        rotation: Math.random() * 360,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)],
        size: Math.random() * 10 + 5
      }));

      setConfetti(pieces);

      const timer = setTimeout(() => {
        setConfetti([]);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              x: piece.x, 
              y: piece.y, 
              rotate: piece.rotation,
              opacity: 1 
            }}
            animate={{ 
              y: window.innerHeight + 100,
              rotate: piece.rotation + 720,
              opacity: 0
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: duration / 1000,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: '2px'
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ==================== LOADING ANIMATIONS ====================

/**
 * Animated loading spinner with custom design
 * Multiple variants for different contexts
 */
export const LoadingSpinner = ({ variant = 'default', size = 'md', text }) => {
  const sizeMap = {
    sm: 24,
    md: 48,
    lg: 72,
    xl: 96
  };

  const spinnerSize = sizeMap[size];

  const variants = {
    default: (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `${spinnerSize / 12}px solid rgba(59, 130, 246, 0.2)`,
          borderTopColor: '#3B82F6',
          borderRadius: '50%'
        }}
      />
    ),
    dots: (
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -20, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2
            }}
            style={{
              width: spinnerSize / 4,
              height: spinnerSize / 4,
              backgroundColor: '#3B82F6',
              borderRadius: '50%'
            }}
          />
        ))}
      </div>
    ),
    pulse: (
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          width: spinnerSize,
          height: spinnerSize,
          backgroundColor: '#3B82F6',
          borderRadius: '50%'
        }}
      />
    ),
    bars: (
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: spinnerSize }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={{ height: ['20%', '100%', '20%'] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1
            }}
            style={{
              width: spinnerSize / 8,
              backgroundColor: '#3B82F6',
              borderRadius: '2px'
            }}
          />
        ))}
      </div>
    )
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      {variants[variant]}
      {text && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: '#6B7280', fontSize: '14px', fontWeight: 500 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

/**
 * Skeleton loader with shimmer effect
 * Used for content loading states
 */
export const SkeletonLoader = ({ width = '100%', height = '20px', borderRadius = '8px', count = 1 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            width,
            height,
            borderRadius,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%'
          }}
          animate={{
            backgroundPosition: ['200% 0', '-200% 0']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </div>
  );
};

// ==================== TRANSITION COMPONENTS ====================

/**
 * Page transition wrapper
 * Smooth transitions between pages
 */
export const PageTransition = ({ children, variant = 'fade' }) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      initial: { x: 100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -100, opacity: 0 }
    },
    scale: {
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.1, opacity: 0 }
    },
    slideUp: {
      initial: { y: 50, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -50, opacity: 0 }
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[variant]}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger children animation
 * Animates children with delay
 */
export const StaggerContainer = ({ children, staggerDelay = 0.1 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Reveal animation on scroll
 * Elements fade in as they enter viewport
 */
export const RevealOnScroll = ({ children, direction = 'up', delay = 0 }) => {
  const [ref, controls] = useScrollAnimation();

  const directions = {
    up: { y: 50 },
    down: { y: -50 },
    left: { x: 50 },
    right: { x: -50 }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={controls}
      variants={{
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: {
            duration: 0.6,
            delay,
            ease: [0.6, -0.05, 0.01, 0.99]
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

// ==================== 3D TRANSFORM EFFECTS ====================

/**
 * 3D card with tilt effect
 * Follows mouse movement for depth
 */
export const Card3D = ({ children, className = '' }) => {
  const cardRef = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXValue = ((y - centerY) / centerY) * -10;
    const rotateYValue = ((x - centerX) / centerX) * 10;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Parallax layer for depth effect
 * Creates layered parallax scrolling
 */
export const ParallaxLayer = ({ children, speed = 0.5, className = '' }) => {
  const offset = useParallax(speed);

  return (
    <motion.div
      style={{ transform: `translateY(${offset}px)` }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ==================== INTERACTIVE ANIMATIONS ====================

/**
 * Magnetic button effect
 * Button follows cursor when nearby
 */
export const MagneticButton = ({ children, strength = 0.3, className = '', onClick }) => {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;

    const button = buttonRef.current;
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={position}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

/**
 * Ripple effect on click
 * Material design ripple animation
 */
export const RippleEffect = ({ children, className = '', onClick }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y
    };

    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      style={{ position: 'relative' }}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
        />
      ))}
    </button>
  );
};

// ==================== SUCCESS/ERROR ANIMATIONS ====================

/**
 * Success checkmark animation
 * Animated checkmark with circle
 */
export const SuccessAnimation = ({ size = 80, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#10B981"
          strokeWidth="4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        <motion.path
          d="M 30 50 L 45 65 L 70 35"
          fill="none"
          stroke="#10B981"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
};

/**
 * Error animation
 * Animated X with shake effect
 */
export const ErrorAnimation = ({ size = 80, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      animate={{ x: [0, -10, 10, -10, 10, 0] }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100">
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#EF4444"
          strokeWidth="4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
        <motion.path
          d="M 35 35 L 65 65 M 65 35 L 35 65"
          fill="none"
          stroke="#EF4444"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeInOut' }}
        />
      </svg>
    </motion.div>
  );
};

// ==================== NOTIFICATION ANIMATIONS ====================

/**
 * Toast notification with slide animation
 * Customizable notification component
 */
export const AnimatedToast = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#10B981', icon: '✓' },
    error: { bg: '#EF4444', icon: '✕' },
    warning: { bg: '#F59E0B', icon: '⚠' },
    info: { bg: '#3B82F6', icon: 'ℹ' }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor: colors[type].bg,
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10000
          }}
        >
          <span style={{ fontSize: '20px' }}>{colors[type].icon}</span>
          <span style={{ fontWeight: 500 }}>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==================== SCROLL PROGRESS INDICATOR ====================

/**
 * Scroll progress bar
 * Shows reading progress at top of page
 */
export const ScrollProgress = ({ color = '#3B82F6' }) => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.pageYOffset / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '4px',
        backgroundColor: color,
        transformOrigin: '0%',
        zIndex: 10000
      }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: scrollProgress / 100 }}
      transition={{ duration: 0.1 }}
    />
  );
};

// ==================== EXPORT ALL COMPONENTS ====================

export default {
  // Hooks
  useCountAnimation,
  useScrollAnimation,
  useParallax,
  useMousePosition,
  useGesture,
  
  // Particle Effects
  ParticleSystem,
  ConfettiAnimation,
  
  // Loading
  LoadingSpinner,
  SkeletonLoader,
  
  // Transitions
  PageTransition,
  StaggerContainer,
  RevealOnScroll,
  
  // 3D Effects
  Card3D,
  ParallaxLayer,
  
  // Interactive
  MagneticButton,
  RippleEffect,
  
  // Status Animations
  SuccessAnimation,
  ErrorAnimation,
  
  // Notifications
  AnimatedToast,
  
  // Scroll
  ScrollProgress
};
