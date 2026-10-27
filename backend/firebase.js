(function (global) {
  'use strict';

  var auth = null;
  var db = null;
  var collection = null;
  var bazarCollection = null;
  var synced = {};
  var syncedBazar = {};
  var unsubscribeItems = null;
  var unsubscribeBazar = null;
  var callbacks = {};

  function stopSync() {
    if (unsubscribeItems) unsubscribeItems();
    if (unsubscribeBazar) unsubscribeBazar();
    unsubscribeItems = null;
    unsubscribeBazar = null;
    collection = null;
    bazarCollection = null;
    synced = {};
    syncedBazar = {};
  }

  function startSync() {
    stopSync();
    collection = db.collection('doacoes');
    bazarCollection = db.collection('bazar');
    unsubscribeItems = collection.onSnapshot(function (snapshot) {
      var items = [];
      synced = {};
      snapshot.forEach(function (document) {
        var item = document.data();
        items.push(item);
        synced[item.id] = JSON.stringify(item);
      });
      callbacks.onItems(items);
    }, function () {
      callbacks.onError('Sem conexão com o servidor');
    });
    unsubscribeBazar = bazarCollection.onSnapshot(function (snapshot) {
      var items = [];
      syncedBazar = {};
      snapshot.forEach(function (document) {
        var item = document.data();
        items.push(item);
        syncedBazar[item.id] = JSON.stringify(item);
      });
      callbacks.onBazarItems(items);
    }, function () {
      callbacks.onError('Não foi possível carregar o estoque do bazar');
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
    db = global.firebase.firestore();
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
      throw new Error('Erro: ' + code);
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

  function save(items) {
    if (!collection) return;
    var operations = [];
    var current = {};
    items.forEach(function (item) {
      var serialized = JSON.stringify(item);
      current[item.id] = true;
      if (synced[item.id] !== serialized) {
        operations.push({ set: item });
        synced[item.id] = serialized;
      }
    });
    Object.keys(synced).forEach(function (id) {
      if (!current[id]) {
        operations.push({ delete: id });
        delete synced[id];
      }
    });
    for (var index = 0; index < operations.length; index += 400) {
      var batch = db.batch();
      operations.slice(index, index + 400).forEach(function (operation) {
        if (operation.set) batch.set(collection.doc(String(operation.set.id)), operation.set);
        else batch.delete(collection.doc(operation.delete));
      });
      batch.commit().catch(function () {
        callbacks.onError('Não foi possível salvar no servidor');
      });
    }
  }

  function saveBazarItems(items) {
    if (!bazarCollection) return;
    var operations = [];
    var current = {};
    items.forEach(function (item) {
      var serialized = JSON.stringify(item);
      current[item.id] = true;
      if (syncedBazar[item.id] !== serialized) {
        operations.push({ set: item });
        syncedBazar[item.id] = serialized;
      }
    });
    Object.keys(syncedBazar).forEach(function (id) {
      if (!current[id]) {
        operations.push({ delete: id });
        delete syncedBazar[id];
      }
    });
    for (var index = 0; index < operations.length; index += 400) {
      var batch = db.batch();
      operations.slice(index, index + 400).forEach(function (operation) {
        if (operation.set) batch.set(bazarCollection.doc(String(operation.set.id)), operation.set);
        else batch.delete(bazarCollection.doc(operation.delete));
      });
      batch.commit().catch(function () {
        callbacks.onError('Não foi possível salvar o estoque do bazar');
      });
    }
  }

  global.DonationBackend = {
    start: start,
    login: login,
    updateProfile: updateProfile,
    logout: function () { return auth.signOut(); },
    save: save,
    saveBazarItems: saveBazarItems,
    newBazarItemId: function () {
      if (!bazarCollection) throw new Error('O Firebase ainda não está conectado.');
      return bazarCollection.doc().id;
    }
  };
})(window);