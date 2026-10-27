(function (global) {
  'use strict';

  var env = import.meta.env;
  global.FIREBASE_CONFIG = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };
  global.FIREBASE_LOGIN_EMAIL = env.VITE_FIREBASE_LOGIN_EMAIL || '';
})(window);