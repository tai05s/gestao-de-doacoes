(function (global) {
  'use strict';

  var auth = null;
  var callbacks = {};
  var syncTimer = null;
  var syncState = null;

  function stopSync() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = null;
    syncState = null;
  }

  function request(path, options) {
    var user = auth && auth.currentUser;
    if (!user) return Promise.reject(new Error('Entre no sistema para continuar.'));

    return user.getIdToken().then(function (token) {
      var config = options || {};
      var headers = { Authorization: 'Bearer ' + token };
      if (config.body) headers['Content-Type'] = 'application/json';
      return fetch((global.DONATION_API_URL || '/api') + path, {
        method: config.method || 'GET',
        headers: headers,
        body: config.body || undefined
      });
    }).then(function (response) {
      return response.json().catch(function () {
        throw new Error('O servidor retornou uma resposta inválida.');
      }).then(function (payload) {
        if (!payload || typeof payload !== 'object') {
          throw new Error('O servidor retornou uma resposta inválida.');
        }
        if (!response.ok) {
          var error = new Error(payload.error && payload.error.message
            ? payload.error.message : 'Não foi possível concluir a solicitação.');
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function reportError(error, state) {
    if (state !== syncState) return;
    if ((error.status === 401 || error.status === 403) && !state.authFailureHandled) {
      state.authFailureHandled = true;
      callbacks.onGate(true, error.message);
      auth.signOut().catch(function (signOutError) {
        callbacks.onError('Não foi possível encerrar a sessão: ' + signOutError.message);
      });
      return;
    }
    callbacks.onError(error.message);
  }

  function serializeItem(item) {
    var normalized = {};
    Object.keys(item).sort().forEach(function (key) { normalized[key] = item[key]; });
    return JSON.stringify(normalized);
  }

  function rememberItems(state, key, items) {
    var records = new Map();
    items.forEach(function (item) {
      records.set(String(item.id), { id: item.id, serialized: serializeItem(item) });
    });
    state.synced[key] = records;
  }

  function loadCollection(key, path, callback, state) {
    if (state.loading[key] || state.pendingWrites) return Promise.resolve();
    state.loading[key] = true;
    return request(path).then(function (payload) {
      if (state === syncState && !state.pendingWrites) {
        rememberItems(state, key, payload.items);
        callback(payload.items);
      }
    }).catch(function (error) {
      reportError(error, state);
    }).then(function () {
      state.loading[key] = false;
    });
  }

  function refresh(state) {
    if (state !== syncState || state.pendingWrites) return;
    loadCollection('donations', '/doacoes', callbacks.onItems, state);
    loadCollection('bazar', '/bazar', callbacks.onBazarItems, state);
  }

  function startSync() {
    stopSync();
    var state = {
      pendingWrites: 0,
      queues: { donations: Promise.resolve(), bazar: Promise.resolve() },
      synced: { donations: new Map(), bazar: new Map() },
      loading: { donations: false, bazar: false },
      authFailureHandled: false
    };
    syncState = state;
    refresh(state);
    syncTimer = setInterval(function () { refresh(state); }, 5000);
  }

  function saveCollection(key, path, items, errorMessage) {
    var state = syncState;
    if (!state) {
      callbacks.onError('Conecte-se ao sistema para salvar os dados.');
      return Promise.resolve();
    }

    var snapshot = JSON.parse(JSON.stringify(items));
    var current = new Map();
    var upserts = [];
    var deletedIds = [];
    snapshot.forEach(function (item) {
      var id = String(item.id);
      current.set(id, item);
      var previous = state.synced[key].get(id);
      if (!previous || previous.serialized !== serializeItem(item)) upserts.push(item);
    });
    state.synced[key].forEach(function (previous, id) {
      if (!current.has(id)) deletedIds.push(previous.id);
    });
    if (!upserts.length && !deletedIds.length) return Promise.resolve();

    state.pendingWrites++;
    var operation = state.queues[key].then(function () {
      if (state !== syncState) return null;
      return request(path, {
        method: 'PATCH',
        body: JSON.stringify({ upserts: upserts, deletedIds: deletedIds })
      }).then(function () {
        if (state !== syncState) return;
        upserts.forEach(function (item) {
          state.synced[key].set(String(item.id), { id: item.id, serialized: serializeItem(item) });
        });
        deletedIds.forEach(function (id) { state.synced[key].delete(String(id)); });
      });
    });
    state.queues[key] = operation.catch(function (error) {
      if (state === syncState) {
        if (error.status === 401 || error.status === 403) reportError(error, state);
        else callbacks.onError(errorMessage + ': ' + error.message);
      }
    });

    return state.queues[key].then(function () {
      state.pendingWrites--;
      if (state === syncState && state.pendingWrites === 0) refresh(state);
    });
  }

  function start(handlers) {
    callbacks = handlers;
    var config = global.FIREBASE_CONFIG;
    if (!config || !config.apiKey || !config.authDomain || !config.projectId || !config.appId ||
        !global.FIREBASE_LOGIN_EMAIL) {
      callbacks.onGate(true, 'Configuração do Firebase pendente. Preencha as variáveis VITE_FIREBASE no arquivo .env.');
      document.getElementById('gatePwd').style.display = 'none';
      document.getElementById('gateBtn').style.display = 'none';
      document.getElementById('gateEmail').style.display = 'none';
      callbacks.onBazarItems([]);
      callbacks.onProfile(null);
      return;
    }

    if (global.firebase.apps.length) global.firebase.app();
    else global.firebase.initializeApp(config);
    auth = global.firebase.auth();
    auth.onAuthStateChanged(function (user) {
      if (user) {
        callbacks.onProfile(user);
        callbacks.onGate(false);
        startSync();
      } else {
        stopSync();
        callbacks.onItems([]);
        callbacks.onBazarItems([]);
        callbacks.onProfile(null);
        callbacks.onGate(true);
      }
    });
  }

  function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password).catch(function (error) {
      var code = error.code || '';
      if (code === 'auth/network-request-failed') throw new Error('Sem conexão com a internet.');
      if (code === 'auth/operation-not-allowed') throw new Error('Login por e-mail/senha não está ativado no Firebase.');
      if (code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        throw new Error('E-mail ou senha incorretos.');
      }
      throw new Error('Não foi possível entrar. Verifique a configuração do Firebase.');
    });
  }

  function updateProfile(displayName) {
    var user = auth && auth.currentUser;
    if (!user) return Promise.reject(new Error('Entre no sistema para editar o perfil.'));
    return user.updateProfile({ displayName: displayName }).then(function () {
      callbacks.onProfile(user);
      return user;
    }).catch(function (error) {
      if (error.code === 'auth/network-request-failed') throw new Error('Sem conexão com a internet.');
      throw new Error('Não foi possível salvar o perfil: ' + (error.message || error.code || 'erro desconhecido'));
    });
  }

  function newBazarItemId() {
    var crypto = global.crypto;
    if (!crypto) throw new Error('Este navegador não permite gerar o identificador do item.');
    if (crypto.randomUUID) return crypto.randomUUID();

    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map.call(bytes, function (byte) {
      return ('0' + byte.toString(16)).slice(-2);
    }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' + hex.slice(20);
  }

  global.DonationBackend = {
    start: start,
    login: login,
    updateProfile: updateProfile,
    logout: function () { return auth.signOut(); },
    save: function (items) { return saveCollection('donations', '/doacoes', items, 'Não foi possível salvar as arrecadações'); },
    saveBazarItems: function (items) { return saveCollection('bazar', '/bazar', items, 'Não foi possível salvar o estoque do bazar'); },
    newBazarItemId: newBazarItemId
  };
})(window);
