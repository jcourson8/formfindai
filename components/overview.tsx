import { motion } from 'framer-motion';
import Link from 'next/link';
import { HomeIcon, BoxIcon, ImageIcon } from './icons';
import { ShoppingCartIcon } from 'lucide-react';

// Minimal text logo component for FormFind
const FormFindLogo = ({ size = 32 }: { size?: number }) => {
  return (
    <div className="relative font-semibold flex items-center text-black dark:text-white" style={{ fontSize: `${size}px` }}>
      <span className="text-primary">Form</span>
      <span>Find</span>
    </div>
  );
};

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <div className="flex justify-center">
          <FormFindLogo size={38} />
        </div>
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center">
            <div className="text-primary mb-2">
              <ImageIcon size={24} />
            </div>
            <span className="text-sm">Generate designs</span>
          </div>
          <div className="flex items-center text-muted-foreground">→</div>
          <div className="flex flex-col items-center">
            <ShoppingCartIcon size={24} className="text-primary mb-2" />
            <span className="text-sm">Shop products</span>
          </div>
        </div>
        <p>
          Design custom furniture with AI, then find real products to buy.
        </p>
      </div>
    </motion.div>
  );
};
