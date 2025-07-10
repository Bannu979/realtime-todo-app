import React, { useRef } from 'react';
import { useDrag } from 'react-dnd';

const ITEM_TYPE = 'TASK';

export default function TaskCard({ task, onDrop, onClick, onEditTask, onDeleteTask }) {
  // Drag source
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { ...task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Determine if this is a Done card
  const isDone = task.status === 'Done';

  return (
    <div
      ref={drag}
      style={{
        background: '#fff',
        border: '1.5px solid #e0e7ef',
        borderRadius: 8,
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(79,140,255,0.06)',
        padding: '1rem',
        transition: 'box-shadow 0.2s, border 0.2s',
        opacity: isDragging ? 0.7 : 1,
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        minHeight: 48,
      }}
      className="task-card"
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
    >
      {/* Drag handle SVG (wiggles on hover) */}
      <span className="icon-wiggle" style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#b3b3b3" strokeWidth="2"><circle cx="5" cy="6" r="1.5"/><circle cx="5" cy="14" r="1.5"/><circle cx="10" cy="6" r="1.5"/><circle cx="10" cy="14" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="14" r="1.5"/></svg>
      </span>
      <span style={{ flex: 1 }}>{task.title}</span>
      {/* Animated checkmark for Done cards */}
      {isDone && (
        <span className="icon-draw" style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#00b894" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="checkmark-svg">
            <circle cx="11" cy="11" r="10" fill="#eafaf1" />
            <polyline points="7,12 10,15 15,8" className="checkmark-poly" />
          </svg>
        </span>
      )}
      {/* Animated edit (pencil) icon, only show on hover */}
      <span className="icon-draw-plus card-action-icon" style={{ marginLeft: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={e => { e.stopPropagation(); onEditTask && onEditTask(task); }} title="Edit">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#4f8cff" strokeWidth="2">
          <polyline points="4,14 14,4" />
          <polyline points="4,14 4,18 8,18 18,8" />
        </svg>
      </span>
      {/* Animated delete (trash) icon, only show on hover */}
      <span className="icon-wiggle card-action-icon" style={{ marginLeft: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={e => { e.stopPropagation(); onDeleteTask && onDeleteTask(task); }} title="Delete">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#e74c3c" strokeWidth="2">
          <rect x="5" y="7" width="10" height="8" rx="2" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="12" y1="10" x2="12" y2="14" />
          <polyline points="3,7 17,7" />
        </svg>
      </span>
    </div>
  );
} 