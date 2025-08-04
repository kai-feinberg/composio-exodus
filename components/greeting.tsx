import { motion } from 'framer-motion';

export const Greeting = () => {
  return (
    <div
      key="overview"
      className="max-w-4xl mx-auto md:mt-16 px-6 lg:px-8 size-full flex flex-col justify-center"
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Welcome to Exodus AI
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your intelligent companion for coding, analysis, and creative problem-solving. 
            What would you like to explore today?
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground"
        >
          <span className="px-3 py-1.5 bg-muted/50 rounded-full border">Code Generation</span>
          <span className="px-3 py-1.5 bg-muted/50 rounded-full border">Analysis & Debugging</span>
          <span className="px-3 py-1.5 bg-muted/50 rounded-full border">Technical Writing</span>
          <span className="px-3 py-1.5 bg-muted/50 rounded-full border">Problem Solving</span>
        </motion.div>
      </div>
    </div>
  );
};
