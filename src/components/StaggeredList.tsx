import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ReactNode } from 'react';

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function StaggeredList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggeredItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}

/** For use inside <TableBody> — renders as <tr> */
export function StaggeredTableBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.tbody
      variants={container}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.tbody>
  );
}

export function StaggeredTableRow({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <motion.tr variants={item} className={className} onClick={onClick}>
      {children}
    </motion.tr>
  );
}
