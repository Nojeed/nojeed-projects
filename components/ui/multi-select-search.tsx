"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Option {
    id: string;
    name: string;
}

interface MultiSelectSearchProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    emptyMessage?: string;
}

export function MultiSelectSearch({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    emptyMessage = "No items found.",
}: MultiSelectSearchProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter((item) => item !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    const selectedOptions = options.filter((opt) => selected.includes(opt.id));
    const filteredOptions = options.filter((opt) =>
        opt.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                className="min-h-10 flex w-full flex-wrap items-center gap-1 overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm cursor-pointer"
                onClick={() => setOpen(true)}
            >
                {selectedOptions.length > 0 ? (
                    selectedOptions.map((opt) => (
                        <Badge key={opt.id} variant="secondary" className="mr-1 mb-1">
                            {opt.name}
                            <div
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(opt.id);
                                }}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </div>
                        </Badge>
                    ))
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <div className="ml-auto flex shrink-0 items-center">
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </div>
            </div>
            {open && (
                <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                    <div className="p-2 border-b">
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 shadow-none"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto w-full p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm">{emptyMessage}</div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = selected.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            isSelected ? "bg-accent text-accent-foreground" : ""
                                        )}
                                        onClick={() => handleSelect(opt.id)}
                                    >
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            {isSelected && <Check className="h-4 w-4" />}
                                        </span>
                                        {opt.name}
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
