import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {notesStoragePlugin} from './scripts/notes-storage-plugin.ts';
import {interfacePlugin} from './scripts/interface-plugin.ts';
import {presentationPlugin} from './scripts/presentation-plugin.ts';
export default defineConfig({plugins:[notesStoragePlugin(),interfacePlugin(),presentationPlugin(),react()],optimizeDeps:{exclude:['@olgakraven/lecture-engine']},base:process.env.BASE_PATH || '/2026-PISID4-lecture/',build:{sourcemap:false}});
