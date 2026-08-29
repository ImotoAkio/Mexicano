import re

with open('src/components/MarinaCaixaView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure imports are present (e.g. Printer, RefreshCw, Archive, CheckCircle2, QrCode, CreditCard, ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Banknote, ShieldCheck, Download, Edit2, Trash2, Loader2, AlertCircle, AlertTriangle, LifeBuoy, Ship, Upload, Minus, FileText, Plus, Search, Filter)
# Add missing icon imports if needed
imports = []
import_line = re.search(r"import\s*{\s*([^}]+)\s*}\s*from\s*'lucide-react'", content)
if import_line:
    existing = [x.strip() for x in import_line.group(1).split(',')]
    needed = ['Printer', 'RefreshCw', 'Archive', 'CheckCircle2', 'QrCode', 'CreditCard', 'ArrowUpRight', 'ArrowDownRight', 'DollarSign', 'Wallet', 'Banknote', 'ShieldCheck', 'Download', 'Edit2', 'Trash2', 'Loader2', 'AlertCircle', 'AlertTriangle', 'LifeBuoy', 'Ship', 'Upload', 'Minus', 'FileText', 'Plus', 'Search', 'Filter', 'X']
    for n in needed:
        if n not in existing:
            existing.append(n)
    
    new_import = "import { " + ", ".join(existing) + " } from 'lucide-react';"
    content = content.replace(import_line.group(0), new_import)

with open('src/components/MarinaCaixaView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

