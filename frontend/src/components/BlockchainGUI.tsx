import React, { useState, useEffect } from 'react';
import { Shield, Lock, FileText, CheckCircle, AlertTriangle, Plus, Eye, Download, Trash2, Code, Bell, Edit3, AlertOctagon, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const BlockchainGUI = () => {
  const [projectName, setProjectName] = useState('');
  const [blockchainId, setBlockchainId] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [selectedBlock, setSelectedBlock] = useState(null);

  const [codigoActual, setCodigoActual] = useState('// Código del proyecto\n');
  const [hashCodigoActual, setHashCodigoActual] = useState('');
  // Función para calcular SHA-256 real
  const calcularSHA256Local = async (texto: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };
  const [validandoAutomaticamente, setValidandoAutomaticamente] = useState(false);
  const [blockchainFraude, setBlockchainFraude] = useState([]);

  // Effect para calcular hash en tiempo real
  useEffect(() => {
    const calcularHash = async () => {
      const hash = await calcularSHA256Local(codigoActual);
      setHashCodigoActual(hash);

      // Verificar si hay cambios con el último bloque
      if (blocks.length > 0) {
        const hashUltimoBloque = blocks[blocks.length - 1].codigo_hash;

        if (hash !== hashUltimoBloque) {
          // Throttling de logs (máximo 1 cada 3 segundos)
          const ahora = Date.now();
          const ultimoLog = logs[0];
          if (!ultimoLog || ahora - ultimoLog.id > 3000) {
            addLog('⚠️ ALERTA: Código modificado - Hash SHA-256 no coincide', 'warning');
          }
        }
      }
    };

    calcularHash();
  }, [codigoActual, blocks]);

  // ============== VALIDACIÓN AUTOMÁTICA EN TIEMPO REAL ==============

  useEffect(() => {
    if (blockchainFraude.length === 0 || blocks.length === 0) return;

    setValidandoAutomaticamente(true);

    // Pequeño delay para no saturar si escribe rápido
    const timer = setTimeout(() => {
      const nuevasValidaciones = [];
      let cadenaRota = false;

      for (let i = 0; i < blockchainFraude.length; i++) {
        const bloqueActual = blockchainFraude[i];
        const bloqueOriginal = blocks[i];

        // Si ya está rota la cadena, todos los siguientes son inválidos
        if (cadenaRota) {
          nuevasValidaciones[i] = {
            valido: false,
            errores: [`Cadena rota: El hash del Bloque #${i - 1} cambió`],
            validaciones: {
              enlace_anterior: { valido: false }
            }
          };
          continue;
        }

        // Verificar si hay modificaciones en el bloque
        const codigoModificado = bloqueActual.codigo_texto !== bloqueOriginal.codigo_texto;
        const codigoHashModificado = bloqueActual.codigo_hash !== bloqueOriginal.codigo_hash;
        const nonceModificado = bloqueActual.nonce !== bloqueOriginal.nonce;
        const powModificado = bloqueActual.pow_hash !== bloqueOriginal.pow_hash;
        const hashActualModificado = bloqueActual.hash_actual !== bloqueOriginal.hash_actual;

        // Verificar observaciones
        const observacionesModificadas = JSON.stringify(bloqueActual.observaciones) !==
          JSON.stringify(bloqueOriginal.observaciones);

        // Verificar enlace con bloque anterior (efecto cascada)
        let enlaceRoto = false;
        if (i > 0) {
          enlaceRoto = bloqueActual.hash_anterior !== blockchainFraude[i - 1].hash_actual;
        }

        // Determinar si el bloque es inválido
        const bloqueModificado = codigoModificado || codigoHashModificado || nonceModificado ||
          powModificado || hashActualModificado || observacionesModificadas;

        if (bloqueModificado || enlaceRoto) {
          const errores = [];
          if (codigoModificado || codigoHashModificado) errores.push("Código modificado");
          if (observacionesModificadas) errores.push("Observaciones modificadas");
          if (nonceModificado || powModificado) errores.push("PoW diferente");
          if (hashActualModificado) errores.push("Hash del bloque diferente");
          if (enlaceRoto) errores.push("Cadena rota: hash_anterior no coincide");

          nuevasValidaciones[i] = {
            valido: false,
            errores: errores,
            validaciones: {
              enlace_anterior: { valido: !enlaceRoto },
              modificado: true
            }
          };

          // Si el hash actual del bloque cambió, rompe la cadena siguiente
          if (hashActualModificado && i < blockchainFraude.length - 1) {
            cadenaRota = true;
          }
        } else {
          // Bloque sin modificar
          nuevasValidaciones[i] = {
            valido: true,
            errores: [],
            validaciones: {
              enlace_anterior: { valido: true },
              modificado: false
            }
          };
        }
      }

      setValidacionFraude(nuevasValidaciones);
      setValidandoAutomaticamente(false);
    }, 300); // Delay de 300ms para no validar en cada tecla

    return () => clearTimeout(timer);
  }, [blockchainFraude, blocks]);

  const [observacionActual, setObservacionActual] = useState('');
  const [observacionesEtapaActual, setObservacionesEtapaActual] = useState([]);

  const [primeraObservacion, setPrimeraObservacion] = useState('Acta de inicio del contrato. Requerimientos funcionales establecidos.');

  const [nuevaEtapa, setNuevaEtapa] = useState({
    etapa: 1,
    mostrarFormulario: false
  });

  const [bloqueEditando, setBloqueEditando] = useState(null);
  const [validacionFraude, setValidacionFraude] = useState([]);

  const ETAPAS = [
    "Establecimiento de requerimientos funcionales",
    "Presentación del primer prototipo funcional",
    "Presentación del prototipo final",
    "Presentación del producto para despliegue",
    "Entrega final y liquidación"
  ];

  // ============== FUNCIONES DEL SIMULADOR DE FRAUDE ==============

  const [calculandoNonce, setCalculandoNonce] = useState({});

  const modificarCodigoFraude = (bloqueId, nuevoCodigo) => {
    setBlockchainFraude(prev => prev.map(block => {
      if (block.id === bloqueId) {
        return { ...block, codigo_texto: nuevoCodigo };
      }
      return block;
    }));
  };

  const modificarObservacionFraude = (indexBloque, indexObs, nuevoTexto) => {
    setBlockchainFraude(prev => prev.map((block, idx) => {
      if (idx === indexBloque) {
        const nuevasObs = [...block.observaciones];
        nuevasObs[indexObs] = { ...nuevasObs[indexObs], texto: nuevoTexto };
        return { ...block, observaciones: nuevasObs };
      }
      return block;
    }));
  };

  const modificarNonceFraude = (indexBloque, nuevoNonce) => {
    setBlockchainFraude(prev => prev.map((block, idx) => {
      if (idx === indexBloque) {
        return { ...block, nonce: nuevoNonce };
      }
      return block;
    }));
  };


  const recalcularHashCodigoFraude = async (indexBloque) => {
    try {
      const block = blockchainFraude[indexBloque];
      const response = await fetch(`${API_URL}/fraude/recalcular-hash-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: block.codigo_texto }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      setBlockchainFraude(prev => prev.map((b, idx) => {
        if (idx === indexBloque) {
          return { ...b, codigo_hash: data.hash };
        }
        return b;
      }));

      addLog(`✅ Hash SHA-256 recalculado para Bloque #${block.id}`, 'success');

      // ✅ ADVERTENCIA: Esto invalidará el PoW y hash actual
      addLog(`⚠️ IMPORTANTE: Debe recalcular el Nonce y Hash Actual del bloque`, 'warning');
    } catch (error) {
      addLog(`❌ Error al recalcular hash: ${error.message}`, 'error');
    }
  };

  const recalcularHashActualFraude = async (indexBloque) => {
    try {
      const block = blockchainFraude[indexBloque];

      const observacionesNormalizadas = block.observaciones.map(obs => ({
        texto: obs.texto,
        hash_md5: obs.hash_md5,
        firma: obs.firma_rsa || obs.firma || '',
        timestamp: obs.timestamp
      }));

      const response = await fetch(`${API_URL}/fraude/recalcular-hash-actual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash_anterior: block.hash_anterior,
          nonce: block.nonce,
          hash_codigo: block.codigo_hash,
          fecha: block.fecha,
          lista_verificacion: block.lista_verificacion,
          observaciones: observacionesNormalizadas,
          pow_hash: block.pow_hash
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      setBlockchainFraude(prev => prev.map((b, idx) => {
        if (idx === indexBloque) {
          return { ...b, hash_actual: data.hash };
        }
        return b;
      }));

      if (data.hash === block.hash_actual) {
        addLog(`✅ Hash SHA-512 verificado - Sin cambios en Bloque #${block.id}`, 'success');
      } else {
        addLog(`✅ Hash SHA-512 recalculado para Bloque #${block.id}`, 'success');
        // ❌ ELIMINAR: propagarCambiosCascada(indexBloque);

        // ✅ EN SU LUGAR: Advertir sobre el efecto cascada
        if (indexBloque < blockchainFraude.length - 1) {
          addLog(`⚠️ ALERTA: El Bloque #${indexBloque + 1} ahora tiene un hash_anterior inválido`, 'warning');
          addLog(`⛓️‍💥 La cadena está ROTA desde el Bloque #${indexBloque + 1} en adelante`, 'error');
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };


  const recalcularNonceFraude = async (indexBloque) => {
    setCalculandoNonce(prev => ({ ...prev, [indexBloque]: true }));
    addLog(`⏳ Calculando nonce para Bloque #${blockchainFraude[indexBloque].id}...`, 'info');

    try {
      const block = blockchainFraude[indexBloque];
      const response = await fetch(`${API_URL}/fraude/recalcular-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash_codigo: block.codigo_hash,
          fecha: block.fecha,
          observaciones: block.observaciones.map(obs => obs.texto)
        }),
      });

      const data = await response.json();

      setBlockchainFraude(prev => prev.map((b, idx) => {
        if (idx === indexBloque) {
          return { ...b, nonce: data.nonce, pow_hash: data.pow_hash };
        }
        return b;
      }));

      addLog(`✅ Nonce encontrado: ${data.nonce} (${data.tiempo}s, ${data.intentos} intentos)`, 'success');
      addLog(`⚠️ IMPORTANTE: Debe recalcular el Hash Actual del bloque`, 'warning');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setCalculandoNonce(prev => ({ ...prev, [indexBloque]: false }));
    }
  };


  const recalcularHashObservacionFraude = async (indexBloque, indexObs) => {
    try {
      const obs = blockchainFraude[indexBloque].observaciones[indexObs];

      console.log('Enviando observación:', obs.texto);

      const response = await fetch(`${API_URL}/fraude/recalcular-hash-observacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texto: obs.texto
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      setBlockchainFraude(prev => prev.map((block, idx) => {
        if (idx === indexBloque) {
          const nuevasObs = [...block.observaciones];
          nuevasObs[indexObs] = { ...nuevasObs[indexObs], hash_md5: data.hash };
          return { ...block, observaciones: nuevasObs };
        }
        return block;
      }));

      addLog(`✅ Hash MD5 recalculado para observación #${indexObs + 1}`, 'success');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      console.error('Error completo:', error);
    }
  };

  const validarBloqueFraude = async (indexBloque) => {
    addLog(`🔍 Validando Bloque #${blockchainFraude[indexBloque].id}...`, 'info');

    try {
      const block = blockchainFraude[indexBloque];
      const response = await fetch(`${API_URL}/fraude/validar-bloque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloque: block }),
      });

      const data = await response.json();

      setValidacionFraude(prev => {
        const nuevo = [...prev];
        nuevo[indexBloque] = data;
        return nuevo;
      });

      if (data.valido) {
        addLog(`✅ Bloque #${block.id} es VÁLIDO`, 'success');
      } else {
        addLog(`❌ Bloque #${block.id} es CORRUPTO: ${data.errores.join(', ')}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };

  const validarTodosLosBloquesFraude = async () => {
    addLog('🔍 Validando cadena completa con efecto cascada...', 'info');

    try {
      const response = await fetch(`${API_URL}/fraude/validar-cadena-completa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bloques: blockchainFraude }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Actualizar validaciones
      setValidacionFraude(data.resultados);

      // Contar bloques válidos e inválidos
      const validos = data.resultados.filter(r => r.valido).length;
      const invalidos = data.resultados.filter(r => !r.valido).length;

      if (invalidos === 0) {
        addLog(`✅ Toda la cadena es válida (${validos} bloques)`, 'success');
      } else {
        addLog(`⚠️ Validación completa: ${validos} válidos, ${invalidos} corruptos`, 'warning');

        // Identificar dónde se rompe la cadena
        const primerRoto = data.resultados.findIndex(r =>
          r.errores.some(e => e.includes("Cadena rota"))
        );

        if (primerRoto !== -1) {
          addLog(`⛓️‍💥 Cadena rota desde el Bloque #${primerRoto}`, 'error');
          addLog(`💡 Causa: El hash_actual del Bloque #${primerRoto - 1} cambió`, 'info');
        }
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };

  const restaurarBlockchainFraude = () => {
    const copiaBlockchain = blocks.map(block => ({
      ...block,
      codigo_texto: block.codigo_texto || '',
      observaciones: block.observaciones.map(obs => ({ ...obs }))
    }));
    setBlockchainFraude(copiaBlockchain);
    setValidacionFraude([]);
    setBloqueEditando(null);
    setCalculandoNonce({});
    addLog('🔄 Blockchain restaurada a su estado original', 'info');
  };

  // ============== EFECTO CASCADA ==============

  // ============== PROPAGAR CAMBIOS MANUALMENTE (OPCIONAL) ==============

  const propagarCambiosManuales = () => {
    addLog('🔗 Propagando cambios manualmente por la cadena...', 'info');

    let cambios = 0;
    setBlockchainFraude(prev => {
      const nuevaBlockchain = [...prev];

      // Recorrer desde el bloque 1 en adelante
      for (let i = 1; i < nuevaBlockchain.length; i++) {
        const bloqueAnterior = nuevaBlockchain[i - 1];
        const bloqueActual = nuevaBlockchain[i];

        // Solo actualizar si hay diferencia
        if (bloqueActual.hash_anterior !== bloqueAnterior.hash_actual) {
          nuevaBlockchain[i] = {
            ...bloqueActual,
            hash_anterior: bloqueAnterior.hash_actual
          };
          cambios++;
        }
      }

      return nuevaBlockchain;
    });

    // Invalidar todas las validaciones
    setValidacionFraude([]);

    addLog(`✅ ${cambios} bloques actualizados con nuevos hash_anterior`, 'success');
    addLog(`⚠️ IMPORTANTE: Cada bloque modificado debe recalcular su hash actual`, 'warning');
  };




  // ============== FUNCIONES DE API ==============

  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const createBlockchain = async () => {
    if (!projectName.trim()) {
      addLog('❌ Error: Debe ingresar un nombre de proyecto', 'error');
      return;
    }

    if (!primeraObservacion.trim()) {
      addLog('❌ Error: Debe ingresar la observación inicial', 'error');
      return;
    }

    addLog('🔐 Creando blockchain con RSA-512 y AES-128...', 'info');
    addLog('💾 Registrando código inicial en bloque génesis...', 'info');

    try {
      const response = await fetch(`${API_URL}/blockchain/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName: projectName,
          primeraObservacion: primeraObservacion,
          codigoInicial: codigoActual  // ✅ Enviar código inicial
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear blockchain');
      }

      const data = await response.json();

      console.log('Blockchain ID recibido:', data.blockchain_id);
      setBlockchainId(data.blockchain_id);
      setBlockchain(data.blockchain);
      setBlocks([data.genesis_block]);

      // Agregar logs del backend
      data.logs?.forEach(log => {
        addLog(log.message, log.type);
      });

      addLog(`✅ Blockchain creada exitosamente (ID: ${data.blockchain_id})`, 'success');
      addLog(`✅ Código inicial registrado (${codigoActual.length} caracteres)`, 'success');
      setActiveTab('code');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };


  const cargarBloques = async () => {
    if (!blockchainId) return;

    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}/blocks`);
      if (!response.ok) throw new Error('Error al cargar bloques');

      const data = await response.json();
      setBlocks(data.blocks);
    } catch (error) {
      addLog(`❌ Error al cargar bloques: ${error.message}`, 'error');
    }
  };

  const agregarObservacion = () => {
    if (!observacionActual.trim()) {
      addLog('❌ Error: Debe escribir una observación', 'error');
      return;
    }

    addLog('🔐 Firmando observación con RSA-512...', 'info');

    const nuevaObs = {
      texto: observacionActual,
      timestamp: new Date().toISOString(),
      pendiente: true
    };

    setObservacionesEtapaActual(prev => [...prev, nuevaObs]);
    addLog('✅ Observación agregada (pendiente de aprobación)', 'success');
    setObservacionActual('');
  };

  const aprobarEtapa = async () => {
    if (observacionesEtapaActual.length === 0) {
      addLog('❌ Error: Debe agregar al menos una observación', 'error');
      return;
    }

    if (!blockchainId) {
      addLog('❌ Error: No hay blockchain ID', 'error');
      return;
    }

    addLog(`⏳ Procesando ${observacionesEtapaActual.length} observaciones...`, 'info');
    addLog('⛏️ Calculando Proof of Work en el backend...', 'info');

    try {
      const url = `${API_URL}/blockchain/${blockchainId}/aprobar-etapa`;

      // ✅ VERIFICAR: Debe ser un array de strings
      const observacionesTexto = observacionesEtapaActual.map(obs => obs.texto);
      console.log('📝 Enviando observaciones:', observacionesTexto);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo: codigoActual,
          etapa: nuevaEtapa.etapa,
          observaciones: observacionesTexto  // ✅ Array de strings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al aprobar etapa');
      }

      const data = await response.json();

      await cargarBloques();

      data.logs?.forEach(log => {
        addLog(log.message, log.type);
      });

      addLog(`✅ ${observacionesTexto.length} observaciones firmadas individualmente`, 'success');

      setNuevaEtapa({
        etapa: nuevaEtapa.etapa + 1,
        mostrarFormulario: false
      });
      setObservacionesEtapaActual([]);
      setActiveTab('blocks');
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      console.error('Error completo:', error);
    }
  };


  const validarCadena = async () => {
    if (!blockchainId) return;

    addLog('🔍 Validando blockchain en el backend...', 'info');

    try {
      const response = await fetch(`${API_URL}/blockchain/${blockchainId}/validate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Error al validar');

      const data = await response.json();

      data.logs?.forEach(log => {
        addLog(log.message, log.type);
      });

      if (data.valid) {
        addLog('✅ Blockchain íntegra y válida', 'success');
      } else {
        addLog(`❌ ${data.message}`, 'error');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    }
  };

  const iniciarNuevaEtapa = () => {
    const ultimoBloque = blocks[blocks.length - 1];
    const siguienteEtapa = ultimoBloque.etapa + 1;

    if (siguienteEtapa >= ETAPAS.length) {
      addLog('❌ Error: No hay más etapas disponibles', 'error');
      return;
    }

    setNuevaEtapa({
      etapa: siguienteEtapa,
      mostrarFormulario: true
    });
    setActiveTab('approve');
  };

  const exportarBlockchain = () => {
    const data = {
      blockchain,
      blocks,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain_${blockchain.name}_${Date.now()}.json`;
    a.click();

    addLog('📥 Blockchain exportada exitosamente', 'success');
  };

  const resetearSistema = async () => {
    if (!confirm('¿Está seguro de eliminar la blockchain actual?')) return;

    if (blockchainId) {
      try {
        await fetch(`${API_URL}/blockchain/${blockchainId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }

    setBlockchain(null);
    setBlocks([]);
    setBlockchainId(null);
    setProjectName('');
    setPrimeraObservacion('Acta de inicio del contrato. Requerimientos funcionales establecidos.');
    setCodigoActual('// Código del proyecto\n');
    setObservacionActual('');
    setObservacionesEtapaActual([]);
    setLogs([]);
    setBlockchainFraude([]);
    setValidacionFraude([]);
    addLog('🗑️ Sistema reiniciado', 'info');
    setActiveTab('create');
  };

  const recalcularCadenaCompleta = async () => {
    addLog('🔄 Recalculando cadena completa desde el inicio...', 'info');

    for (let i = 1; i < blockchainFraude.length; i++) {
      const bloqueAnterior = blockchainFraude[i - 1];
      const bloqueActual = blockchainFraude[i];

      // Actualizar hash_anterior del bloque actual
      setBlockchainFraude(prev => prev.map((b, idx) => {
        if (idx === i) {
          return { ...b, hash_anterior: bloqueAnterior.hash_actual };
        }
        return b;
      }));

      addLog(`✅ Bloque #${i}: hash_anterior actualizado`, 'success');
    }

    addLog('✅ Cadena recalculada. Valide los bloques individualmente.', 'success');
  };


  // Simulador de fraude (validación local)
  // Effect para copiar blockchain al simulador de fraude
  useEffect(() => {
    if (activeTab === 'fraud' && blocks.length > 0) {
      const copiaBlockchain = blocks.map(block => ({
        id: block.id,
        etapa: block.etapa,
        fecha: block.fecha,
        hash_anterior: block.hash_anterior,
        codigo_hash: block.codigo_hash,
        codigo_texto: block.codigo_texto,
        nonce: block.nonce,
        pow_hash: block.pow_hash,
        hash_actual: block.hash_actual,
        lista_verificacion: [...block.lista_verificacion],
        observaciones: block.observaciones.map(obs => ({
          texto: obs.texto,
          hash_md5: obs.hash_md5,
          firma_rsa: obs.firma_rsa,
          timestamp: obs.timestamp
        })),
        cifrado_aes: block.cifrado_aes
      }));
      setBlockchainFraude(copiaBlockchain);
      setValidacionFraude([]); // Limpiar validaciones anteriores
    }
  }, [activeTab, blocks]);






  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold">Contratos Inteligentes con RSA-512 + AES-128</h1>
              <p className="text-sm text-gray-400">Sistema de aprobación de proyectos con blockchain</p>
            </div>
          </div>

          {blockchain && (
            <div className="flex gap-2">
              <button
                onClick={validarCadena}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Validar Cadena
              </button>
              <button
                onClick={exportarBlockchain}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                onClick={resetearSistema}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Resetear
              </button>
            </div>

          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'create' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Crear Blockchain
          </button>
          <button
            onClick={() => setActiveTab('code')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'code' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Editor de Código
          </button>
          <button
            onClick={() => setActiveTab('observations')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'observations' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />
            Observaciones
          </button>
          <button
            onClick={() => setActiveTab('approve')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'approve' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Aprobar Etapa
          </button>
          <button
            onClick={() => setActiveTab('blocks')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'blocks' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Ver Blockchain
          </button>
          <button
            onClick={() => setActiveTab('fraud')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'fraud' ? 'border-b-2 border-red-400 text-red-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <AlertOctagon className="w-4 h-4 inline mr-2" />
            Simulador de Fraude
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            disabled={!blockchain}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-gray-400 hover:text-white'
              } ${!blockchain && 'opacity-50 cursor-not-allowed'}`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Logs
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'create' && (
            <div className="bg-slate-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-purple-400" />
                Inicializar Nuevo Contrato
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Proyecto</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Sistema de Gestión Universitaria"
                  />
                </div>

                {/* ✅ NUEVO: Campo para código inicial */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Código Inicial del Proyecto
                    <span className="text-gray-400 text-xs ml-2">(Se registrará en el bloque génesis)</span>
                  </label>
                  <textarea
                    value={codigoActual}
                    onChange={(e) => setCodigoActual(e.target.value)}
                    className="w-full h-48 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    placeholder="// Código inicial del proyecto&#10;&#10;console.log('Hola Mundo');"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Este código se registrará en el bloque génesis con su hash SHA-256
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Observación Inicial (Etapa 1)</label>
                  <textarea
                    value={primeraObservacion}
                    onChange={(e) => setPrimeraObservacion(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                    placeholder="Describa la observación inicial del contrato..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Esta observación se firmará con RSA-512 y será inmutable
                  </p>
                </div>

                <button
                  onClick={createBlockchain}
                  disabled={!projectName.trim() || !primeraObservacion.trim()}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  Crear Blockchain con RSA-512
                </button>

                {blockchain && (
                  <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                    <h3 className="font-bold mb-2">📊 Información del Blockchain</h3>
                    <p className="text-sm text-gray-300">Proyecto: <span className="text-purple-400">{blockchain.name}</span></p>
                    <p className="text-sm text-gray-300">RSA: <span className="text-purple-400">{blockchain.rsaBits} bits</span></p>
                    <p className="text-sm text-gray-300">Creado: <span className="text-purple-400">{new Date(blockchain.createdAt).toLocaleString()}</span></p>
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === 'code' && blockchain && (
            <div className="bg-slate-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Code className="w-6 h-6 text-purple-400" />
                  Editor de Código - Verificación SHA-256 en Tiempo Real
                </h2>
              </div>

              {/* Alerta de Código Modificado */}
              {blocks.length > 0 && hashCodigoActual && hashCodigoActual !== blocks[blocks.length - 1].codigo_hash && (
                <div className="mb-4 p-4 bg-red-900 border-2 border-red-500 rounded-lg animate-pulse">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-300 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-red-200 mb-2">
                        ⚠️ ALERTA DE SEGURIDAD - Código Modificado Detectado
                      </h3>
                      <p className="text-sm text-red-300 mb-2">
                        El código ha sido modificado desde la última aprobación. El hash SHA-256 no coincide con el registrado en el bloque #{blocks[blocks.length - 1].id}.
                      </p>
                      <div className="bg-red-800/50 p-3 rounded mt-3 space-y-2 text-xs font-mono">
                        <div>
                          <p className="text-red-400">Hash Registrado (Bloque #{blocks[blocks.length - 1].id}):</p>
                          <p className="text-red-200 break-all">{blocks[blocks.length - 1].codigo_hash}</p>
                        </div>
                        <div>
                          <p className="text-red-400">Hash Actual (Código modificado):</p>
                          <p className="text-yellow-300 break-all">{hashCodigoActual}</p>
                        </div>
                      </div>
                      <p className="text-xs text-red-400 mt-3">
                        📧 Notificación automática enviada a los interesados
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor de Código */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Código del Proyecto</label>
                  <textarea
                    value={codigoActual}
                    onChange={(e) => setCodigoActual(e.target.value)}
                    className="w-full h-96 px-4 py-2 bg-slate-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    placeholder="Escriba el código del proyecto aquí..."
                    spellCheck={false}
                  />
                </div>

                {/* Hash SHA-256 en Tiempo Real */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Hash Actual del Código */}
                  <div className={`p-4 rounded-lg border-2 transition-all ${blocks.length > 0 && hashCodigoActual && hashCodigoActual !== blocks[blocks.length - 1].codigo_hash
                    ? 'bg-red-900/30 border-red-500'
                    : 'bg-green-900/30 border-green-500'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        {blocks.length > 0 && hashCodigoActual && hashCodigoActual !== blocks[blocks.length - 1].codigo_hash ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-red-200">Hash SHA-256 Actual - MODIFICADO</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-200">Hash SHA-256 Actual - SIN CAMBIOS</span>
                          </>
                        )}
                      </p>
                      <span className="text-xs px-2 py-1 bg-slate-800 rounded flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Tiempo real
                      </span>
                    </div>
                    <p className={`font-mono text-xs break-all leading-relaxed ${blocks.length > 0 && hashCodigoActual && hashCodigoActual !== blocks[blocks.length - 1].codigo_hash
                      ? 'text-red-300'
                      : 'text-green-300'
                      }`}>
                      {hashCodigoActual || 'Calculando...'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      ℹ️ Usando Web Crypto API - SHA-256 estándar (mismo algoritmo que el backend)
                    </p>
                  </div>

                  {/* Hash Registrado (Último Bloque) */}
                  {blocks.length > 0 && (
                    <div className="bg-slate-700 p-4 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-300">
                          Hash Registrado en Bloque #{blocks[blocks.length - 1].id}
                        </p>
                        <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">
                          Última aprobación
                        </span>
                      </div>
                      <p className="font-mono text-xs text-blue-400 break-all leading-relaxed">
                        {blocks[blocks.length - 1].codigo_hash}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        📅 {new Date(blocks[blocks.length - 1].fecha).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}

                  {/* Comparación Visual */}
                  {blocks.length > 0 && hashCodigoActual && (
                    <div className="bg-slate-700 p-4 rounded-lg border border-gray-600">
                      <p className="text-sm font-semibold text-gray-300 mb-3">🔍 Estado de Verificación</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {hashCodigoActual === blocks[blocks.length - 1].codigo_hash ? (
                              <CheckCircle className="w-6 h-6 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1">
                            {hashCodigoActual === blocks[blocks.length - 1].codigo_hash ? (
                              <div>
                                <p className="text-green-400 font-semibold">✅ Código Íntegro</p>
                                <p className="text-xs text-gray-400">El hash SHA-256 coincide con el registrado en el bloque</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-red-400 font-semibold">⚠️ Código Modificado</p>
                                <p className="text-xs text-gray-400">
                                  El hash SHA-256 ha cambiado. Apruebe una nueva etapa para registrar los cambios
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Estadísticas */}
                        <div className="bg-slate-800 p-3 rounded">
                          <p className="text-xs text-gray-400 mb-1">Estadísticas del código:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500">Caracteres:</p>
                              <p className="text-white font-mono">{codigoActual.length}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Líneas:</p>
                              <p className="text-white font-mono">{codigoActual.split('\n').length}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Palabras:</p>
                              <p className="text-white font-mono">{codigoActual.trim().split(/\s+/).length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Información */}
                <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-200 font-semibold mb-2">ℹ️ Sistema de Verificación Criptográfica</p>
                      <ul className="text-sm text-blue-300 space-y-1">
                        <li>• Hash SHA-256 calculado con Web Crypto API (estándar del navegador)</li>
                        <li>• Mismo algoritmo que usa Python hashlib.sha256() en el backend</li>
                        <li>• Verificación automática contra el último bloque aprobado</li>
                        <li>• Alertas en tiempo real ante cualquier modificación</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}



          {activeTab === 'observations' && blockchain && (
            <div className="bg-slate-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-purple-400" />
                Gestión de Observaciones
              </h2>

              {observacionesEtapaActual.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    📝 Observaciones Pendientes ({observacionesEtapaActual.length}):
                  </h3>
                  <div className="space-y-3">
                    {observacionesEtapaActual.map((obs, idx) => (
                      <div key={idx} className="bg-slate-700 p-4 rounded-lg border-l-4 border-yellow-500">
                        <p className="text-sm font-medium mb-2">{obs.texto}</p>
                        <p className="text-xs text-gray-400">
                          📅 {new Date(obs.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-yellow-400 mt-1">
                          ⏳ Pendiente de aprobación
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nueva Observación</label>
                  <textarea
                    value={observacionActual}
                    onChange={(e) => setObservacionActual(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                    placeholder="Escriba la observación..."
                  />
                </div>

                <button
                  onClick={agregarObservacion}
                  disabled={!observacionActual.trim()}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  Agregar Observación
                </button>
              </div>
            </div>
          )}

          {activeTab === 'approve' && blockchain && (
            <div className="bg-slate-800 p-6 rounded-lg border border-gray-700">
              {!nuevaEtapa.mostrarFormulario ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No hay etapa en proceso</h3>
                  <p className="text-gray-400 mb-6">
                    Etapa actual: {blocks.length > 0 ? ETAPAS[blocks[blocks.length - 1].etapa] : 'N/A'}
                  </p>
                  <button
                    onClick={iniciarNuevaEtapa}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Iniciar Nueva Etapa
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold mb-4">
                    Aprobar Etapa {nuevaEtapa.etapa + 1}: {ETAPAS[nuevaEtapa.etapa]}
                  </h2>

                  {observacionesEtapaActual.length === 0 ? (
                    <div className="p-6 bg-slate-700 rounded-lg text-center">
                      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                      <p className="text-lg font-semibold mb-2">No hay observaciones para esta etapa</p>
                      <button
                        onClick={() => setActiveTab('observations')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium inline-flex items-center gap-2"
                      >
                        <Edit3 className="w-5 h-5" />
                        Ir a Observaciones
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-700 rounded-lg">
                        <h3 className="font-bold mb-2">📋 Resumen:</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          {observacionesEtapaActual.length} observación{observacionesEtapaActual.length > 1 ? 'es' : ''} para aprobar
                        </p>
                        <div className="space-y-2">
                          {observacionesEtapaActual.map((obs, idx) => (
                            <div key={idx} className="bg-slate-600 p-2 rounded text-sm">
                              <p>{obs.texto}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={aprobarEtapa}
                        className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Aprobar Etapa {nuevaEtapa.etapa + 1}
                      </button>

                      <button
                        onClick={() => setNuevaEtapa({ etapa: nuevaEtapa.etapa, mostrarFormulario: false })}
                        className="w-full px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'blocks' && blockchain && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-2">📊 Información de la Blockchain</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Proyecto:</p>
                    <p className="text-white font-semibold">{blockchain.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total de bloques:</p>
                    <p className="text-white font-semibold">{blocks.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">RSA:</p>
                    <p className="text-white font-semibold">{blockchain.rsaBits} bits</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Creado:</p>
                    <p className="text-white font-semibold">{new Date(blockchain.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {blocks.map((block) => (
                <div key={block.id} className="bg-slate-800 p-6 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Lock className="w-5 h-5 text-purple-400" />
                      Bloque #{block.id} - Etapa {block.etapa + 1}
                    </h3>
                    <button
                      onClick={() => setSelectedBlock(selectedBlock === block.id ? null : block.id)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                    >
                      {selectedBlock === block.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                    </button>
                  </div>

                  <div className="mb-4">
                    <p className="text-lg font-semibold text-purple-300">{ETAPAS[block.etapa]}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      📅 {new Date(block.fecha).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>

                  {selectedBlock === block.id && (
                    <div className="space-y-3 text-sm">
                      {/* Hash Anterior */}
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-300 font-semibold">🔗 Hash Anterior (SHA-512)</p>
                          <span className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded">SHA-512</span>
                        </div>
                        <p className="font-mono text-xs text-blue-400 break-all leading-relaxed">
                          {block.hash_anterior}
                        </p>
                        {block.id === 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            ℹ️ Bloque génesis - Hash anterior de ceros (cadena de 128 ceros)
                          </p>
                        )}
                      </div>

                      {/* Hash del Código */}
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-gray-300 font-semibold">💾 Hash del Código (SHA-256)</p>
                          <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded">SHA-256</span>
                        </div>
                        <p className="font-mono text-xs text-green-400 break-all leading-relaxed">
                          {block.codigo_hash}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Hash SHA-256 del código fuente en esta etapa
                        </p>
                      </div>

                      {/* Fecha y Hora */}
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-gray-300 font-semibold mb-2">📅 Fecha y Hora de Ingreso</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-400">Timestamp ISO:</p>
                            <p className="font-mono text-xs text-white">{block.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Formato legible:</p>
                            <p className="text-xs text-white">
                              {new Date(block.fecha).toLocaleString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Nonce y PoW - CORREGIDO */}
                      <div className="bg-yellow-900/30 border-2 border-yellow-700 p-4 rounded-lg">
                        <p className="text-yellow-200 font-bold mb-3 flex items-center gap-2">
                          ⛏️ Proof of Work (Prueba de Trabajo)
                        </p>

                        <div className="space-y-3">
                          {/* Nonce */}
                          <div className="bg-yellow-800/30 p-3 rounded">
                            <p className="text-yellow-200 text-sm font-semibold mb-2">Nonce (Número encontrado):</p>
                            <p className="text-3xl font-bold text-yellow-300">{block.nonce.toLocaleString()}</p>
                            <p className="text-xs text-yellow-400 mt-2">
                              Se probaron {block.nonce.toLocaleString()} intentos hasta encontrar un hash MD5 que empiece con "00"
                            </p>
                          </div>

                          {/* Hash PoW (MD5) */}
                          <div className="bg-yellow-800/30 p-3 rounded">
                            <p className="text-yellow-200 text-sm font-semibold mb-2">Hash PoW (MD5):</p>
                            <p className="font-mono text-xs text-yellow-300 break-all">
                              {block.pow_hash}
                            </p>
                            <div className="mt-2">
                              {block.pow_hash.startsWith('000') ? (
                                <span className="text-xs px-2 py-1 bg-yellow-900 text-yellow-200 rounded">
                                  ⚠️ Hash válido pero con más de 2 ceros
                                </span>
                              ) : block.pow_hash.startsWith('00') ? (
                                <span className="text-xs px-2 py-1 bg-green-900 text-green-300 rounded">
                                  ✅ Hash válido - Empieza con exactamente "00"
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded">
                                  ❌ Hash inválido - No empieza con "00"
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Explicación del cálculo */}
                          <div className="bg-yellow-800/20 p-3 rounded border border-yellow-700">
                            <p className="text-xs text-yellow-200 font-semibold mb-1">📝 Cálculo del PoW:</p>
                            <p className="text-xs text-yellow-300 font-mono">
                              MD5(nonce + hash_codigo_SHA256 + fecha + observaciones) = {block.pow_hash.substring(0, 16)}...
                            </p>
                            <p className="text-xs text-yellow-400 mt-2">
                              El nonce {block.nonce} fue el número que generó este hash MD5 con prefijo "00"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Verificación */}
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <p className="text-gray-300 font-semibold mb-3">✅ Lista de Verificación de Etapas</p>
                        <div className="space-y-2">
                          {ETAPAS.map((etapa, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-2 rounded ${block.lista_verificacion[idx]
                                ? 'bg-green-900/30 border-l-4 border-green-500'
                                : 'bg-gray-800 border-l-4 border-gray-600'
                                }`}
                            >
                              <div className="flex-shrink-0">
                                {block.lista_verificacion[idx] ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-600 rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${block.lista_verificacion[idx] ? 'text-white font-medium' : 'text-gray-400'
                                  }`}>
                                  Etapa {idx + 1}: {etapa}
                                </p>
                              </div>
                              {block.lista_verificacion[idx] && (
                                <span className="text-xs px-2 py-1 bg-green-800 text-green-200 rounded">
                                  Completada ✓
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div className="bg-green-900/30 border-2 border-green-700 p-4 rounded-lg">
                        <p className="text-green-200 font-bold mb-3 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          📝 Observaciones ({block.observaciones.length})
                        </p>
                        <div className="space-y-3">
                          {block.observaciones.map((obs, idx) => (
                            <div key={idx} className="bg-green-800/50 p-4 rounded-lg border border-green-600">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-white font-medium flex-1">{obs.texto}</p>
                                <span className="text-xs px-2 py-1 bg-green-900 text-green-200 rounded ml-2">
                                  #{idx + 1}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 gap-2 mt-3 text-xs">
                                <div className="bg-green-900/50 p-2 rounded">
                                  <p className="text-green-300 font-semibold mb-1">🔐 Firma RSA-512:</p>
                                  <p className="font-mono text-green-200 break-all">
                                    {obs.firma_rsa}
                                  </p>
                                </div>

                                <div className="bg-green-900/50 p-2 rounded">
                                  <p className="text-green-300 font-semibold mb-1">🔒 Hash MD5:</p>
                                  <p className="font-mono text-green-200">
                                    {obs.hash_md5}
                                  </p>
                                </div>

                                <div className="bg-green-900/50 p-2 rounded">
                                  <p className="text-green-300 font-semibold mb-1">📅 Timestamp:</p>
                                  <p className="text-green-200">
                                    {new Date(obs.timestamp).toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hash Actual - CORREGIDO */}
                      <div className="bg-purple-900/30 border-2 border-purple-500 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-purple-200 font-bold">🔐 Hash Actual del Bloque (SHA-512)</p>
                          <span className="text-xs px-2 py-1 bg-purple-900 text-purple-300 rounded">SHA-512</span>
                        </div>
                        <p className="font-mono text-xs text-purple-400 break-all leading-relaxed">
                          {block.hash_actual}
                        </p>
                        <div className="mt-3 bg-purple-800/30 p-3 rounded">
                          <p className="text-xs text-purple-200 font-semibold mb-1">📝 Cálculo del Hash Actual:</p>
                          <p className="text-xs text-purple-300 font-mono leading-relaxed">
                            SHA512(hash_anterior + nonce + hash_codigo + fecha + lista_verificacion + observaciones + pow_hash)
                          </p>
                          <p className="text-xs text-purple-400 mt-2">
                            Este hash incluye TODOS los datos del bloque y es el que se usa como "hash_anterior" del siguiente bloque
                          </p>
                        </div>
                      </div>

                      {/* Cifrado AES */}
                      <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-5 h-5 text-blue-400" />
                          <p className="text-blue-200 font-semibold">🔒 Cifrado AES-128</p>
                        </div>
                        <p className="text-sm text-blue-300">
                          Los datos de este bloque están cifrados con AES-128 usando el polinomio irreducible índice 23
                        </p>
                        {block.cifrado_aes && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-800 text-blue-200 rounded">
                            ✅ Datos cifrados y protegidos
                          </span>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Resumen cuando está colapsado */}
                  {selectedBlock !== block.id && (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-700 p-2 rounded text-center">
                        <p className="text-gray-400">Hash Actual</p>
                        <p className="font-mono text-purple-400 truncate">
                          {block.hash_actual.substring(0, 12)}...
                        </p>
                      </div>
                      <div className="bg-slate-700 p-2 rounded text-center">
                        <p className="text-gray-400">Nonce</p>
                        <p className="text-yellow-400 font-bold">{block.nonce.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-700 p-2 rounded text-center">
                        <p className="text-gray-400">Observaciones</p>
                        <p className="text-green-400 font-bold">{block.observaciones.length}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}


          {activeTab === 'fraud' && blockchain && (
            <div className="space-y-4">
              <div className="bg-orange-900/30 border-2 border-orange-500 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-orange-200 mb-2">
                        ⚠️ Simulador de Fraude - Ambiente de Prueba
                      </h3>
                      {validandoAutomaticamente && (
                        <span className="text-xs px-2 py-1 bg-blue-600 rounded animate-pulse">
                          🔄 Validando...
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-orange-300 mb-2">
                      Los bloques se validan automáticamente mientras editas. Los cambios se marcan en rojo instantáneamente.
                    </p>

                    {/* Estadísticas */}
                    {validacionFraude.length > 0 && (
                      <div className="bg-orange-800/50 p-3 rounded mt-3 mb-3">
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-green-300">
                              {validacionFraude.filter(v => v?.valido).length} Válidos
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-red-300">
                              {validacionFraude.filter(v => v?.valido === false).length} Corruptos
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-orange-300 mb-2">
                      Esta es una copia de la blockchain donde puede modificar datos para simular intentos de fraude.
                      Todos los cálculos usan los mismos algoritmos del backend.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={restaurarBlockchainFraude}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Restaurar Original
                      </button>
                      <button
                        onClick={validarTodosLosBloquesFraude}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Validar con Backend
                      </button>

                      {/* ✅ NUEVO */}
                      <button
                        onClick={propagarCambiosManuales}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Propagar Cambios Manualmente
                      </button>
                    </div>

                  </div>
                </div>
              </div>


              {blockchainFraude.map((block, index) => (
                <div
                  key={block.id}
                  className={`p-6 rounded-lg border-2 transition-all ${validacionFraude[index]?.valido === false
                    ? 'bg-red-900/30 border-red-500'
                    : validacionFraude[index]?.valido === true
                      ? 'bg-green-900/30 border-green-500'
                      : 'bg-slate-800 border-gray-700'
                    }`}
                >
                  {/* Header del Bloque */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Lock className="w-5 h-5 text-purple-400" />
                      Bloque #{block.id} - Etapa {block.etapa + 1}
                      {validacionFraude[index]?.valido === false && (
                        <span className="text-sm px-3 py-1 bg-red-600 rounded-full animate-pulse">
                          ❌ CORRUPTO
                        </span>
                      )}
                      {validacionFraude[index]?.valido === true && (
                        <span className="text-sm px-3 py-1 bg-green-600 rounded-full">
                          ✅ VÁLIDO
                        </span>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBloqueEditando(bloqueEditando === block.id ? null : block.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        {bloqueEditando === block.id ? 'Colapsar' : 'Editar'}
                      </button>
                      <button
                        onClick={() => validarBloqueFraude(index)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Validar
                      </button>
                    </div>
                  </div>

                  {/* ✅ NUEVO: Visualización del enlace con el bloque anterior */}
                  {index > 0 && (
                    <div className={`mb-4 p-3 rounded border ${validacionFraude[index]?.validaciones?.enlace_anterior?.valido === false
                      ? 'bg-red-900/30 border-red-500'
                      : validacionFraude[index]?.validaciones?.enlace_anterior?.valido === true
                        ? 'bg-green-900/20 border-green-600'
                        : block.hash_anterior === blockchainFraude[index - 1].hash_actual
                          ? 'bg-green-900/20 border-green-600'
                          : 'bg-red-900/30 border-red-500'
                      }`}>
                      <div className="flex items-start gap-2 text-sm">
                        {(() => {
                          const enlaceValido = validacionFraude[index]?.validaciones?.enlace_anterior?.valido ??
                            (block.hash_anterior === blockchainFraude[index - 1].hash_actual);

                          return enlaceValido ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-green-300 font-semibold">🔗 Enlace válido con Bloque #{index - 1}</p>
                                <p className="text-xs text-green-400 mt-1">
                                  El hash_anterior coincide con el hash_actual del bloque previo
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                              <div className="flex-1">
                                <p className="text-red-300 font-semibold">⛓️‍💥 Cadena rota con Bloque #{index - 1}</p>
                                <p className="text-xs text-red-400 mt-1">
                                  El hash_anterior NO coincide. La integridad de la cadena está comprometida.
                                </p>
                                <div className="mt-2 bg-red-800/30 p-2 rounded text-xs font-mono space-y-2">
                                  <div>
                                    <p className="text-red-400">Hash esperado (hash_actual del Bloque #{index - 1}):</p>
                                    <p className="text-red-200 break-all">{blockchainFraude[index - 1].hash_actual}</p>
                                  </div>
                                  <div>
                                    <p className="text-red-400">Hash actual (hash_anterior de este bloque):</p>
                                    <p className="text-yellow-300 break-all">{block.hash_anterior}</p>
                                  </div>
                                </div>
                                <div className="mt-2 bg-orange-800/30 p-2 rounded">
                                  <p className="text-xs text-orange-300">
                                    <strong>💡 Causa probable:</strong> El Bloque #{index - 1} fue modificado y su hash_actual cambió.
                                    Este bloque quedó desvinculado aunque internamente sea válido.
                                  </p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <p className="text-lg font-semibold text-purple-300 mb-3">{ETAPAS[block.etapa]}</p>

                  {/* Errores de Validación */}
                  {validacionFraude[index]?.errores && validacionFraude[index].errores.length > 0 && (
                    <div className="mb-4 p-3 bg-red-800/50 border border-red-600 rounded">
                      <p className="font-bold text-red-200 mb-2">🚨 Errores detectados:</p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {validacionFraude[index].errores.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bloqueEditando === block.id && (
                    <div className="space-y-4 text-sm">
                      {/* Editor de Código */}
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <label className="block text-gray-300 font-semibold mb-2">
                          💾 Código del Proyecto (Editable)
                        </label>
                        <textarea
                          value={block.codigo_texto}
                          onChange={(e) => modificarCodigoFraude(block.id, e.target.value)}
                          className="w-full h-32 px-3 py-2 bg-slate-900 border border-gray-600 rounded font-mono text-xs focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => recalcularHashCodigoFraude(index)}
                          className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                        >
                          Recalcular Hash SHA-256 del Código
                        </button>

                        {/* Mostrar hash del código */}
                        <div className="mt-3 bg-slate-800 p-2 rounded">
                          <p className="text-xs text-gray-400">Hash SHA-256 Actual:</p>
                          <p className={`font-mono text-xs mt-1 ${validacionFraude[index]?.validaciones?.hash_codigo?.valido === false
                            ? 'text-red-400'
                            : 'text-green-400'
                            }`}>
                            {block.codigo_hash}
                          </p>
                          {validacionFraude[index]?.validaciones?.hash_codigo && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400">Hash Calculado:</p>
                              <p className="font-mono text-xs text-yellow-400">
                                {validacionFraude[index].validaciones.hash_codigo.calculado}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Editor de Observaciones */}
                      <div className="bg-green-900/30 border-2 border-green-700 p-4 rounded-lg">
                        <p className="text-green-200 font-bold mb-3">
                          📝 Observaciones (Editables)
                        </p>
                        {block.observaciones.map((obs, obsIdx) => (
                          <div key={obsIdx} className="mb-3 bg-green-800/50 p-3 rounded border border-green-600">
                            <label className="block text-xs text-green-300 mb-1">
                              Observación #{obsIdx + 1}
                            </label>
                            <textarea
                              value={obs.texto}
                              onChange={(e) => modificarObservacionFraude(index, obsIdx, e.target.value)}
                              className="w-full px-2 py-1 bg-green-900 border border-green-600 rounded text-sm text-white"
                              rows={2}
                            />
                            <button
                              onClick={() => recalcularHashObservacionFraude(index, obsIdx)}
                              className="mt-2 px-2 py-1 bg-green-700 hover:bg-green-800 rounded text-xs"
                            >
                              Recalcular Hash MD5
                            </button>
                            <div className="mt-2 text-xs">
                              <p className="text-green-300">Hash MD5:
                                <span className="font-mono ml-2 text-green-200">{obs.hash_md5}</span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Nonce y PoW */}
                      <div className="bg-yellow-900/30 border-2 border-yellow-700 p-4 rounded-lg">
                        <p className="text-yellow-200 font-bold mb-3">⛏️ Proof of Work</p>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-yellow-300 mb-1">Nonce:</label>
                            <input
                              type="number"
                              value={block.nonce}
                              onChange={(e) => modificarNonceFraude(index, parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 bg-yellow-900 border border-yellow-600 rounded text-white"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => recalcularNonceFraude(index)}
                              className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-semibold"
                              disabled={calculandoNonce[index]}
                            >
                              {calculandoNonce[index] ? '⏳ Calculando...' : '⛏️ Calcular Nonce'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-yellow-800/30 p-2 rounded">
                          <p className="text-xs text-yellow-300">Hash PoW (MD5):</p>
                          <p className={`font-mono text-xs mt-1 ${validacionFraude[index]?.validaciones?.pow?.valido === false
                            ? 'text-red-400'
                            : block.pow_hash.startsWith('00')
                              ? 'text-green-400'
                              : 'text-yellow-400'
                            }`}>
                            {block.pow_hash}
                          </p>
                          {validacionFraude[index]?.validaciones?.pow && (
                            <div className="mt-2">
                              <p className="text-xs text-yellow-300">Hash Calculado:</p>
                              <p className="font-mono text-xs text-yellow-200">
                                {validacionFraude[index].validaciones.pow.calculado}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hash Actual */}
                      <div className="bg-purple-900/30 border-2 border-purple-500 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-purple-200 font-bold">🔐 Hash Actual del Bloque</p>
                          <button
                            onClick={() => recalcularHashActualFraude(index)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                          >
                            Recalcular SHA-512
                          </button>
                        </div>
                        <p className={`font-mono text-xs break-all ${validacionFraude[index]?.validaciones?.hash_actual?.valido === false
                          ? 'text-red-400'
                          : 'text-purple-400'
                          }`}>
                          {block.hash_actual}
                        </p>
                        {validacionFraude[index]?.validaciones?.hash_actual && (
                          <div className="mt-3 bg-purple-800/30 p-2 rounded">
                            <p className="text-xs text-purple-300">Hash Calculado:</p>
                            <p className="font-mono text-xs text-purple-200 break-all">
                              {validacionFraude[index].validaciones.hash_actual.calculado}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Info del bloque siguiente (si existe) */}
                      {index < blockchainFraude.length - 1 && (
                        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
                          <div className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-yellow-300 font-semibold">⚠️ Efecto Cascada</p>
                              <p className="text-xs text-yellow-400 mt-1">
                                Si modifica este bloque, el Bloque #{index + 1} quedará con un hash_anterior inválido.
                                Deberá propagar los cambios manualmente si desea "reparar" la cadena.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}


          {activeTab === 'logs' && blockchain && (
            <div className="bg-slate-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Bell className="w-6 h-6 text-purple-400" />
                Registro de Eventos
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay logs disponibles</p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded text-sm ${log.type === 'success' ? 'bg-green-900 border-l-4 border-green-500' :
                        log.type === 'error' ? 'bg-red-900 border-l-4 border-red-500' :
                          log.type === 'warning' ? 'bg-yellow-900 border-l-4 border-yellow-500' :
                            'bg-slate-700 border-l-4 border-blue-500'
                        }`}
                    >
                      <p className="font-medium">{log.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{log.timestamp}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default BlockchainGUI;
