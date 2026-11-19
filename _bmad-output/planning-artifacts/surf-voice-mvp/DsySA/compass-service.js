/**
 * DsySA Compass Service — Bússola Dinâmica em Tempo Real
 * 
 * Compatibilidade Cross-Browser:
 * - iOS Safari 13+ com permissão explícita (DeviceOrientationEvent.requestPermission)
 * - Android Chrome / Blink com deviceorientationabsolute e fallback para deviceorientation
 * - Compensação de orientação de tela (screen.orientation / window.orientation)
 * - Suavização de rotação contínua (anti-salto 359° <-> 0° via unwrapping de ângulo acumulado)
 * - Filtro passa-baixa (EMA - Exponential Moving Average) para eliminar jitter do sensor
 * - Verificação de contexto seguro (HTTPS / localhost)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DsySACompass = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CARDINAL_POINTS_16 = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];

  function getCardinalDirection(degrees) {
    const norm = ((degrees % 360) + 360) % 360;
    const index = Math.round(norm / 22.5) % 16;
    return CARDINAL_POINTS_16[index];
  }

  function isSecureContext() {
    if (typeof window === 'undefined') return true;
    if (typeof window.isSecureContext === 'boolean') {
      return window.isSecureContext;
    }
    const proto = window.location.protocol;
    const host = window.location.hostname;
    return proto === 'https:' || host === 'localhost' || host === '127.0.0.1';
  }

  function getScreenOrientationAngle() {
    if (typeof window === 'undefined') return 0;
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      return window.screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return 0;
  }

  class CompassService {
    constructor(options = {}) {
      this.smoothingFactor = options.smoothingFactor || 0.18; // Fator do filtro passa-baixa
      this.isActive = false;
      this.defaultLiveEnabled = true; // Modo ao vivo ativado como padrão
      this.userDisabled = false;      // Só desativa se o usuário clicar explicitamente para desligar
      this._iosGestureArmed = false;
      this.status = 'idle'; // 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'insecure_context' | 'error'
      this.errorMessage = null;

      this.rawHeading = 0; // [0, 360)
      this.currentHeading = 0; // [0, 360) normalizado e suavizado
      this.cardinalPoint = 'N';

      this.prevRawHeading = null;
      this.accumulatedHeading = 0; // Ângulo desenrolado contínuo (evita salto 359° <-> 0°)
      this.filteredHeading = 0; // Média móvel do heading

      this.targetDialRotation = 0; // -accumulatedHeading
      this.filteredDialRotation = 0; // Rotação suave aplicada ao mostrador

      this.hasReceivedEvent = false;
      this.detectionTimer = null;
      this.rafId = null;

      this.listeners = new Set();
      this.boundElements = new Set();

      this._handleOrientation = this._handleOrientation.bind(this);
      this._handleScreenChange = this._handleScreenChange.bind(this);
      this._tick = this._tick.bind(this);
    }

    /**
     * Verifica se o navegador tem suporte preliminar à API de orientação
     */
    isSupported() {
      if (typeof window === 'undefined') return false;
      return (
        'DeviceOrientationEvent' in window ||
        'ondeviceorientationabsolute' in window ||
        'ondeviceorientation' in window
      );
    }

    /**
     * Verifica se o dispositivo exige gesto explícito do usuário (iOS Safari 13+)
     */
    requiresUserGesture() {
      return (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      );
    }

    /**
     * Ativa automaticamente o modo Bússola ao Vivo como padrão:
     * - Android / Chrome: inicia imediatamente ao carregar.
     * - iOS Safari 13+: arma ativação automática no primeiro toque na tela.
     * - Desktop sem magnetômetro: mantém estado silencioso sem exibir erro intrusivo.
     */
    autoStartDefault() {
      if (this.userDisabled || this.isActive) return;

      if (this.requiresUserGesture()) {
        if (!this._iosGestureArmed && typeof window !== 'undefined') {
          this._iosGestureArmed = true;
          const activateOnFirstTouch = () => {
            this._iosGestureArmed = false;
            if (!this.userDisabled && !this.isActive) {
              this.start({ silentUnsupported: true });
            }
          };
          window.addEventListener('touchend', activateOnFirstTouch, { once: true, passive: true });
          window.addEventListener('click', activateOnFirstTouch, { once: true, passive: true });
        }
        return;
      }

      this.start({ silentUnsupported: true });
    }

    /**
     * Inicia a captura de orientação com solicitação de permissão (se necessário)
     */
    async start(options = {}) {
      const silentUnsupported = Boolean(options && options.silentUnsupported);
      if (this.isActive) return true;
      this.userDisabled = false;

      // 1. Verificação de Contexto Seguro (HTTPS / localhost)
      if (!isSecureContext()) {
        this.status = 'insecure_context';
        this.errorMessage = silentUnsupported ? null : 'Acesso a sensores bloqueado: requer contexto seguro (HTTPS ou localhost).';
        this._notifyListeners();
        return false;
      }

      // 2. Verificação de Suporte
      if (!this.isSupported()) {
        this.status = 'unsupported';
        this.errorMessage = silentUnsupported ? null : 'DeviceOrientationEvent não suportado neste navegador.';
        this._notifyListeners();
        return false;
      }

      this.status = 'requesting';
      this.errorMessage = null;
      this._notifyListeners();

      // 3. Permissão Explícita no iOS Safari 13+
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const permissionState = await DeviceOrientationEvent.requestPermission();
          if (permissionState !== 'granted') {
            this.status = 'denied';
            this.errorMessage = 'Permissão de sensor negada pelo usuário no iOS Safari.';
            this._notifyListeners();
            return false;
          }
        } catch (err) {
          this.status = 'denied';
          this.errorMessage = 'Erro ao solicitar permissão de orientação no Safari: ' + (err.message || err);
          this._notifyListeners();
          return false;
        }
      }

      // 4. Registro dos Listeners Cross-Browser
      this.hasReceivedEvent = false;
      this.prevRawHeading = null;

      // Chrome/Android: prioriza deviceorientationabsolute (com Norte geográfico/magnético real)
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', this._handleOrientation, true);
      } else if ('ondeviceorientation' in window) {
        window.addEventListener('deviceorientation', this._handleOrientation, true);
      }

      // Mudança de orientação da tela (retrato vs paisagem)
      if (window.screen && window.screen.orientation && typeof window.screen.orientation.addEventListener === 'function') {
        window.screen.orientation.addEventListener('change', this._handleScreenChange);
      } else {
        window.addEventListener('orientationchange', this._handleScreenChange);
      }

      this.isActive = true;
      this.status = 'active';

      // 5. Inicia o loop de animação contínua (60fps) com filtro passa-baixa
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(this._tick);

      // 6. Timeout de detecção de hardware (se desktop ou sem magnetômetro)
      clearTimeout(this.detectionTimer);
      this.detectionTimer = setTimeout(() => {
        if (!this.hasReceivedEvent) {
          this.status = silentUnsupported ? 'active' : 'unsupported';
          this.errorMessage = silentUnsupported
            ? null
            : 'Nenhum sensor de magnetômetro detectado (comum em desktops). Arraste a rosa dos ventos manualmente!';
          this._notifyListeners();
        }
      }, 2400);

      this._notifyListeners();
      return true;
    }

    /**
     * Interrompe o rastreamento ao vivo
     */
    stop() {
      if (!this.isActive && this.status !== 'requesting') return;

      this.isActive = false;
      this.status = 'idle';
      this.errorMessage = null;

      clearTimeout(this.detectionTimer);
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', this._handleOrientation, true);
        window.removeEventListener('deviceorientation', this._handleOrientation, true);
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.removeEventListener === 'function') {
          window.screen.orientation.removeEventListener('change', this._handleScreenChange);
        }
        window.removeEventListener('orientationchange', this._handleScreenChange);
      }

      // Remove classe live-tracking dos elementos vinculados
      this.boundElements.forEach(el => {
        if (el) el.classList.remove('live-tracking');
      });

      this._notifyListeners();
    }

    /**
     * Alterna o estado de ativação
     */
    async toggle() {
      if (this.isActive) {
        this.stop();
        return false;
      }
      return await this.start();
    }

    /**
     * Registra callback para receber atualizações de estado
     */
    subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      this.listeners.add(callback);
      // Dispara imediatamente com o estado atual
      callback(this.getState());
      return () => {
        this.listeners.delete(callback);
      };
    }

    /**
     * Vincula diretamente um elemento rotor SVG ou HTML para rotação via GPU sem repaints
     */
    attachElement(element) {
      if (!element) return;
      this.boundElements.add(element);
      if (this.isActive) {
        element.classList.add('live-tracking');
      }
    }

    detachElement(element) {
      if (!element) return;
      element.classList.remove('live-tracking');
      this.boundElements.delete(element);
    }

    /**
     * Handler do evento de orientação com normalização iOS vs Android
     */
    _handleOrientation(event) {
      let heading = null;

      // 1. iOS Safari (WebKit proprietário)
      if (typeof event.webkitCompassHeading === 'number' && !isNaN(event.webkitCompassHeading)) {
        heading = event.webkitCompassHeading;
      }
      // 2. Android Chrome (deviceorientationabsolute ou deviceorientation com alpha)
      else if (typeof event.alpha === 'number' && !isNaN(event.alpha)) {
        // W3C: alpha cresce no sentido anti-horário. Para azimute horário: (360 - alpha) % 360
        heading = (360 - event.alpha) % 360;
      }

      if (heading === null) return;

      // 3. Compensação de orientação da tela do smartphone (retrato vs paisagem)
      const screenAngle = getScreenOrientationAngle();
      heading = (heading + screenAngle) % 360;
      if (heading < 0) heading += 360;

      this.hasReceivedEvent = true;
      this.rawHeading = heading;
      this.cardinalPoint = getCardinalDirection(heading);

      // 4. Algoritmo de Ângulo Acumulado Contínuo (Anti-Salto 359° <-> 0°)
      if (this.prevRawHeading === null) {
        this.prevRawHeading = heading;
        this.accumulatedHeading = heading;
        this.filteredHeading = heading;
        this.targetDialRotation = -heading;
        this.filteredDialRotation = -heading;
      } else {
        // Calcula o menor caminho angular no intervalo [-180, +180]
        const delta = ((heading - this.prevRawHeading + 540) % 360) - 180;
        this.accumulatedHeading += delta;
        this.prevRawHeading = heading;
        this.targetDialRotation = -this.accumulatedHeading;
      }
    }

    _handleScreenChange() {
      // Força recálculo no próximo tick
      this.prevRawHeading = null;
    }

    /**
     * Loop 60fps de suavização (Low-Pass Filter) e renderização direta
     */
    _tick() {
      if (!this.isActive) return;

      // Filtro passa-baixa (EMA)
      const alpha = this.smoothingFactor;
      this.filteredHeading += (this.accumulatedHeading - this.filteredHeading) * alpha;
      this.filteredDialRotation += (this.targetDialRotation - this.filteredDialRotation) * alpha;

      this.currentHeading = ((Math.round(this.filteredHeading) % 360) + 360) % 360;
      this.cardinalPoint = getCardinalDirection(this.currentHeading);

      // Atualiza elementos vinculados diretamente via transform CSS
      const rotStr = `rotate(${this.filteredDialRotation.toFixed(2)}deg)`;
      this.boundElements.forEach((el) => {
        if (!el || !el.isConnected) {
          this.boundElements.delete(el);
          return;
        }
        if (!el.classList.contains('live-tracking')) {
          el.classList.add('live-tracking');
        }
        el.style.transform = rotStr;
      });

      this._notifyListeners();

      this.rafId = requestAnimationFrame(this._tick);
    }

    _notifyListeners() {
      const state = this.getState();
      this.listeners.forEach((fn) => {
        try {
          fn(state);
        } catch (e) {
          console.error('[DsySACompass] Erro em listener:', e);
        }
      });
    }

    getState() {
      return {
        isActive: this.isActive,
        status: this.status,
        errorMessage: this.errorMessage,
        heading: this.currentHeading,
        rawHeading: Math.round(this.rawHeading),
        cardinal: this.cardinalPoint,
        dialRotation: this.filteredDialRotation,
        isSupported: this.isSupported(),
        isSecure: isSecureContext()
      };
    }
  }

  // Instância singleton compartilhada na página
  const compassInstance = new CompassService();

  /**
   * Hook / Helper simplificado para integração universal
   */
  function useCompass(callback) {
    if (typeof callback === 'function') {
      return compassInstance.subscribe(callback);
    }
    return compassInstance;
  }

  return {
    CompassService,
    compass: compassInstance,
    useCompass,
    getCardinalDirection,
    isSecureContext
  };
});
