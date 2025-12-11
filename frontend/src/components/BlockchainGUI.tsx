import React, { useState } from 'react';
import { Shield, Lock, FileText, CheckCircle, AlertTriangle, Plus, Eye, Download, Trash2 } from 'lucide-react';

// Configuración de la API
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

interface Block {
  id: number;
  hash_anterior: string;
  codigo: string;
  etapa: number;
  fecha: string;
  nonce: number;
  hash_actual: string;
  observaciones: string[];
  cifrado: boolean;
  fraudulento: boolean;
}

interface Blockchain {
  name: string;
  rsaBits: number;
}

const BlockchainGUI = () => {
  const [projectName, setProjectName] = useState('');
  const [blockchainId, setBlockchainId] = useState<string | null>(null);
  const [blockchain, setBlockchain] = useState<Blockchain | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [newBlock, setNewBlock] = useState({
    codigo: '',
    etapa: 0,
    observacion: ''
  });

  const ETAPAS = [
    "Establecimiento de requerimientos funcionales",
    "Presentación del primer prototipo funcional",
    "Presentación del prototipo final",
    "Presentación del producto para despliegue",
    "Entrega final y liquidación"
  ];

  const addLog = (message: string, type = 'info') => {
    const newLog = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const createBlockchain = async () => {
    if (!projectName.trim()) {
      addLog('Error: Debe ingresar un nombre de proyecto', 'error');
      return;
    }

    setLoading(true);
    addLog('🔐 Generando blockchain con RSA-512...', 'info');
    
    try {
      const response = await fetch(`${API_URL}/blockchain/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName })
      });

      if (!response.ok) throw new Error('Error al crear blockchain');

      const data = await response.json();
      
      setBlockchainId(data.blockchain_id);
      setBlockchain(data.blockchain);
      setBlocks([data.genesis_block]);
      
      addLog(`✅ Blockchain creada: ${projectName}`, 'success');
      addLog(`✅ Bloque génesis generado`, 'success');
      setActiveTab('blocks');
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addNewBlock = async () => {
    if (!newBlock.codigo || !newBlock.observacion) {
      addLog('Error: Complete todos los campos', 'error');
      return;
    }

    if (!blockchainId) return;

    setLoading(true);
    addLog('⏳ Calculando Proof of Work...', 'info');
    
    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}/add-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlock)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      const data = await response.json();
      
      setBlocks(prev => [...prev, data.block]);
      addLog(`✅ Bloque agregado: Etapa ${newBlock.etapa + 1}`, 'success');
      addLog(`✅ PoW calculado (nonce=${data.block.nonce})`, 'success');
      
      setNewBlock({ codigo: '', etapa: newBlock.etapa + 1, observacion: '' });
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateChain = async () => {
    if (!blockchainId) return;

    addLog('🔍 Validando blockchain...', 'info');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}/validate`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.valid) {
        addLog('✅ Blockchain íntegra y válida', 'success');
      } else {
        addLog(`❌ ${data.message}`, 'error');
      }

      // Agregar notificaciones del backend
      data.notifications?.forEach((notif: any) => {
        addLog(notif.mensaje, notif.tipo);
      });
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const simulateFraud = async (blockId: number) => {
    if (!blockchainId) return;

    addLog(`⚠️ SIMULACIÓN: Intento de modificación en bloque ${blockId}`, 'warning');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}/simulate-fraud/${blockId}`, {
        method: 'POST'
      });

      const data = await response.json();
      
      data.notifications?.forEach((notif: any) => {
        addLog(notif.mensaje, notif.tipo);
      });

      // Recargar blockchain
      await loadBlockchain();
    } catch (error) {
      addLog(`Error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchain = async () => {
    if (!blockchainId) return;

    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}`);
      const data = await response.json();
      
      setBlockchain(data.blockchain);
      setBlocks(data.blocks);
    } catch (error) {
      console.error('Error loading blockchain:', error);
    }
  };

  const exportChain = () => {
    const data = JSON.stringify({ blockchain, blocks }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain_${blockchain?.name}_${Date.now()}.json`;
    a.click();
    addLog('📥 Blockchain exportada', 'success');
  };

  const resetBlockchain = async () => {
    if (!blockchainId) return;
    
    if (confirm('¿Está seguro de eliminar la blockchain actual?')) {
      try {
        await fetch(`${API_URL}/blockchain/${blockchainId}`, {
          method: 'DELETE'
        });
        
        setBlockchain(null);
        setBlocks([]);
        setProjectName('');
        setBlockchainId(null);
        setNewBlock({ codigo: '', etapa: 0, observacion: '' });
        addLog('🗑️ Blockchain eliminada', 'info');
        setActiveTab('create');
      } catch (error) {
        addLog(`Error: ${error}`, 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-purple-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Sistema Blockchain
            </h1>
          </div>
          <p className="text-slate-300 text-lg">
            Contratos Inteligentes con RSA-512 + AES-128
          </p>
        </div>

        {/* Navigation Tabs */}
        {blockchain && (
          <div className="flex gap-2 mb-6 bg-slate-800/50 p-2 rounded-lg backdrop-blur">
            <button
              onClick={() => setActiveTab('blocks')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'blocks'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <FileText className="inline w-5 h-5 mr-2" />
              Bloques
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'add'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Plus className="inline w-5 h-5 mr-2" />
              Agregar Etapa
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'logs'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <Eye className="inline w-5 h-5 mr-2" />
              Logs
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed top-4 right-4 bg-purple-600 px-6 py-3 rounded-lg shadow-lg animate-pulse">
            Procesando...
          </div>
        )}

        {/* Create Blockchain */}
        {!blockchain && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-2xl border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold">Crear Nueva Blockchain</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ej: Sistema de Gestión ERP v3.0"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white placeholder-slate-500"
                />
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold mb-2 text-purple-400">Características:</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>✓ RSA-512 para firmas digitales</li>
                  <li>✓ AES-128 para cifrado de datos</li>
                  <li>✓ SHA-256, SHA-512, MD5 para hashing</li>
                  <li>✓ Proof of Work (PoW)</li>
                </ul>
              </div>

              <button
                onClick={createBlockchain}
                disabled={!projectName.trim() || loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                🚀 Crear Blockchain
              </button>
            </div>
          </div>
        )}

        {/* Blocks View */}
        {blockchain && activeTab === 'blocks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">{blockchain.name}</h2>
                <p className="text-slate-400">Total de bloques: {blocks.length}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={validateChain}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Validar Cadena
                </button>
                <button
                  onClick={exportChain}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Exportar
                </button>
                <button
                  onClick={resetBlockchain}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Eliminar
                </button>
              </div>
            </div>

            {blocks.map((block) => (
              <div
                key={block.id}
                className={`bg-slate-800/50 backdrop-blur rounded-xl p-6 shadow-xl border transition-all cursor-pointer ${
                  block.fraudulento 
                    ? 'border-red-500 shadow-red-500/50' 
                    : selectedBlock?.id === block.id
                    ? 'border-purple-500'
                    : 'border-slate-700 hover:border-purple-500'
                }`}
                onClick={() => setSelectedBlock(selectedBlock?.id === block.id ? null : block)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-3xl font-bold ${block.fraudulento ? 'text-red-400' : 'text-purple-400'}`}>
                        #{block.id}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold">
                          {block.etapa === 0 ? 'Génesis' : `Etapa ${block.etapa}`}
                        </h3>
                        <p className="text-sm text-slate-400">{ETAPAS[block.etapa]}</p>
                      </div>
                      {block.fraudulento && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 rounded-full border border-red-500 animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-semibold text-red-400">MODIFICADO</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {block.cifrado && !block.fraudulento && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-600/20 rounded-full border border-purple-500">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-400">AES-128</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 mb-1">Código:</p>
                    <p className={`font-mono text-xs p-2 rounded truncate ${
                      block.fraudulento ? 'bg-red-900/30 text-red-300' : 'bg-slate-900/50'
                    }`}>
                      {block.codigo}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Fecha:</p>
                    <p className={`font-mono text-xs p-2 rounded ${
                      block.fraudulento ? 'bg-red-900/30 text-red-300' : 'bg-slate-900/50'
                    }`}>
                      {new Date(block.fecha).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Hash Anterior:</p>
                    <p className="font-mono text-xs bg-slate-900/50 p-2 rounded truncate">
                      {block.hash_anterior.substring(0, 32)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Hash Actual:</p>
                    <p className={`font-mono text-xs p-2 rounded truncate ${
                      block.fraudulento ? 'bg-red-900/30 text-red-300' : 'bg-slate-900/50'
                    }`}>
                      {block.hash_actual.substring(0, 32)}...
                    </p>
                  </div>
                </div>

                {selectedBlock?.id === block.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    <div>
                      <p className="text-slate-400 mb-1">Nonce:</p>
                      <p className="font-mono text-sm bg-slate-900/50 p-2 rounded">
                        {block.nonce}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1">Observaciones:</p>
                      {block.observaciones.map((obs, idx) => (
                        <p key={idx} className={`text-sm p-3 rounded mb-2 ${
                          block.fraudulento ? 'bg-red-900/30 text-red-300' : 'bg-slate-900/50'
                        }`}>
                          {obs}
                        </p>
                      ))}
                    </div>
                    
                    {block.id > 0 && !block.fraudulento && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          simulateFraud(block.id);
                        }}
                        disabled={loading}
                        className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-700 border border-red-500 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        Simular Fraude
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Block View */}
        {blockchain && activeTab === 'add' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Agregar Nueva Etapa</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Código del Bloque
                </label>
                <input
                  type="text"
                  value={newBlock.codigo}
                  onChange={(e) => setNewBlock({...newBlock, codigo: e.target.value})}
                  placeholder="Ej: Core_Module_v1.0"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Etapa (actual: {newBlock.etapa})
                </label>
                <select
                  value={newBlock.etapa}
                  onChange={(e) => setNewBlock({...newBlock, etapa: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-white"
                >
                  {ETAPAS.map((etapa, i) => (
                    <option key={i} value={i} disabled={i < blocks[blocks.length-1]?.etapa + 1}>
                      {i + 1}. {etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Observación
                </label>
                <textarea
                  value={newBlock.observacion}
                  onChange={(e) => setNewBlock({...newBlock, observacion: e.target.value})}
                  placeholder="Descripción detallada de la etapa completada..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white resize-none"
                />
              </div>

              <button
                onClick={addNewBlock}
                disabled={!newBlock.codigo || !newBlock.observacion || loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-purple-500/50"
              >
                <Plus className="inline w-6 h-6 mr-2" />
                Agregar Bloque
              </button>
            </div>
          </div>
        )}

        {/* Logs View */}
        {blockchain && activeTab === 'logs' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-4">Registro de Actividad</h2>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No hay logs disponibles</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.type === 'error'
                        ? 'bg-red-900/20 border-red-500'
                        : log.type === 'success'
                        ? 'bg-green-900/20 border-green-500'
                        : log.type === 'warning'
                        ? 'bg-yellow-900/20 border-yellow-500'
                        : 'bg-slate-900/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{log.message}</p>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainGUI;