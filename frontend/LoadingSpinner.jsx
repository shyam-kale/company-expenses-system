import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const spinnerVariants = {
    start: {
      rotate: 0
    },
    end: {
      rotate: 360
    }
  };

  const containerVariants = {
    start: {
      opacity: 0,
      scale: 0.8
    },
    end: {
      opacity: 1,
      scale: 1
    }
  };

  const dotVariants = {
    start: {
      y: "0%"
    },
    end: {
      y: "100%"
    }
  };

  const dotTransition = {
    duration: 0.5,
    repeat: Infinity,
    repeatType: "reverse",
    ease: "easeInOut"
  };

  return (
    <motion.div
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      variants={containerVariants}
      initial="start"
      animate="end"
      transition={{ duration: 0.3 }}
    >
      {/* Animated Spinner */}
      <motion.div
        className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full`}
        variants={spinnerVariants}
        initial="start"
        animate="end"
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Loading Text with Animated Dots */}
      {text && (
        <div className="flex items-center space-x-1">
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            {text.replace('...', '')}
          </span>
          <div className="flex space-x-1">
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="w-1 h-1 bg-blue-600 rounded-full"
                variants={dotVariants}
                initial="start"
                animate="end"
                transition={{
                  ...dotTransition,
                  delay: index * 0.1
                }}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Full screen loading component
export const FullScreenLoader = ({ text = 'Loading application...' }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <LoadingSpinner size="xl" text={text} />
        
        {/* Company Logo Animation */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ExpenseTracker
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Managing expenses with intelligence
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Skeleton loader for content
export const SkeletonLoader = ({ lines = 3, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3 last:mb-0"
          style={{ width: `${Math.random() * 40 + 60}%` }}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.1
          }}
        />
      ))}
    </div>
  );
};

// Card skeleton loader
export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

// Button loading state
export const ButtonLoader = ({ size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-white border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

export default LoadingSpinner;