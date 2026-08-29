import fs from 'fs';
let content = fs.readFileSync('src/components/MarinaOperador/ChecklistCaptureModal.tsx', 'utf8');

const replacement = `const ANGLES_JET: ChecklistAngle[] = [
  { id: 'frente',       angleKey: 'frente',       name: 'Frente (Proa)',            description: 'Bico e casco frontal',                          required: true,  svgPath: '/checklist/jet/frente.png' },
  { id: 'popa',         angleKey: 'popa',         name: 'Traseira (Popa/Turbina)',  description: 'Bocal de turbina e traseira',                    required: true,  svgPath: '/checklist/jet/tras.png' },
  { id: 'bombordo',     angleKey: 'bombordo',     name: 'Lateral Bombordo',         description: 'Costado lateral esquerdo completo',              required: true,  svgPath: '/checklist/jet/esquerda.png' },
  { id: 'boreste',      angleKey: 'boreste',      name: 'Lateral Boreste',          description: 'Costado lateral direito completo',               required: true,  svgPath: '/checklist/jet/direita.png' },
  { id: '45_bb_proa',   angleKey: '45_bb_proa',   name: '45° Bombordo Proa',        description: 'Diagonal esquerda frontal',                      required: true },
  { id: '45_bb_popa',   angleKey: '45_bb_popa',   name: '45° Bombordo Popa',        description: 'Diagonal esquerda traseira',                     required: true },
  { id: '45_be_proa',   angleKey: '45_be_proa',   name: '45° Boreste Proa',         description: 'Diagonal direita frontal',                       required: true },
  { id: '45_be_popa',   angleKey: '45_be_popa',   name: '45° Boreste Popa',         description: 'Diagonal direita traseira',                      required: true },
  { id: 'painel',       angleKey: 'painel',       name: 'Painel / Guidão / Display',description: 'Display digital, botões e guidão',               required: true,  svgPath: '/checklist/jet/painel.png' },
  { id: 'casco',        angleKey: 'casco',        name: 'Casco Inferior / Fundo',   description: 'Linha d\'água e fundo do casco',                 required: true,  svgPath: '/checklist/jet/casco.png' },
];`;

content = content.replace(/const ANGLES_JET: ChecklistAngle\[\] = \[[\s\S]*?\];/, replacement);
fs.writeFileSync('src/components/MarinaOperador/ChecklistCaptureModal.tsx', content, 'utf8');
