import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../App';

function SearchableSelect({ options = [], value, onChange, placeholder, emptyLabel, disabled = false }) {
    const { t } = useAuth();

    const displayPlaceholder = placeholder || t('select') || 'Select...';
    const displayEmptyLabel = emptyLabel || t('all') || 'All';
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const selectedOption = options.find(o => String(o.value) === String(value));

    // Close on outside click — use mousedown on document level
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = search.trim()
        ? options.filter(o => 
            o.label?.toLowerCase().includes(search.toLowerCase()) || 
            o.subLabel?.toLowerCase().includes(search.toLowerCase()) ||
            o.searchKeywords?.toLowerCase().includes(search.toLowerCase())
          )
        : options;

    const handleSelect = (val) => {
        onChange(val);
        setOpen(false);
        setSearch('');
    };

    const handleTriggerClick = () => {
        if (disabled) return;
        if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setOpen(prev => {
            if (!prev) setTimeout(() => inputRef.current?.focus(), 30);
            return !prev;
        });
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    // Prevent dropdown from closing when clicking inside it (especially the input)
    const handleDropdownMouseDown = (e) => {
        e.preventDefault(); // prevents blur on the trigger from propagating
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Trigger button */}
            <div
                onClick={handleTriggerClick}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: '8px',
                    background: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '42px',
                    color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'border-color 0.2s',
                    ...(open ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' } : {}),
                    userSelect: 'none',
                }}
            >
                <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? selectedOption.label : displayPlaceholder}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                    {value && !disabled && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); handleClear(e); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', pointerEvents: 'none' }} />
                </div>
            </div>

            {/* Dropdown — rendered via fixed position to escape overflow:hidden parents */}
            {open && (
                <div
                    onMouseDown={handleDropdownMouseDown}
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        zIndex: 99999,
                        background: 'var(--bg-primary)', border: '1px solid var(--border)',
                        borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                        overflow: 'hidden', maxHeight: '280px', display: 'flex', flexDirection: 'column'
                    }}
                >
                    {/* Search input */}
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)' }}>
                        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('search') || 'Search...'}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                width: '100%', fontSize: '0.9rem', color: 'var(--text-primary)',
                                direction: 'rtl', padding: '2px 0'
                            }}
                        />
                    </div>

                    {/* Options list */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {/* Empty / reset option */}
                        <div
                            onClick={() => handleSelect('')}
                            onMouseDown={e => e.preventDefault()}
                            style={{
                                padding: '10px 14px', cursor: 'pointer',
                                borderBottom: '1px solid var(--border)',
                                background: !value ? 'rgba(59,130,246,0.08)' : 'transparent',
                                color: 'var(--text-muted)', fontSize: '0.9rem',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = !value ? 'rgba(59,130,246,0.08)' : 'transparent'}
                        >
                            {displayEmptyLabel}
                        </div>

                        {filtered.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {t('noData') || 'No results found'}
                            </div>
                        ) : (
                            filtered.map(opt => {
                                const isSelected = String(opt.value) === String(value);
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        onMouseDown={e => e.preventDefault()}
                                        style={{
                                            padding: '10px 14px', cursor: 'pointer',
                                            background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent',
                                            fontWeight: isSelected ? 600 : 400,
                                            color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                            fontSize: '0.9rem',
                                            borderBottom: '1px solid var(--border)'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(59,130,246,0.08)' : 'transparent'; }}
                                    >
                                        {opt.label}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SearchableSelect;
