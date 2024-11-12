import { registerApplication, start } from "single-spa";
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from "single-spa-layout";
import microfrontendLayout from "./microfrontend-layout.html";
import { PublicClientApplication, BrowserCacheLocation, LogLevel, InteractionRequiredAuthError } from "@azure/msal-browser";

/**
 * @author ASW Jhon Tovar - 2024-03
 * Single spa Angular - MSAL b2c
 */

/**Parametro enviado al*/
const toolbarAction = {
  logoutRedirect: function () {
    //Parametro callback desde el mf(header-seg) para logout
    fnCerrarSessionRedirect();
  },
  logout: function () {
    //Parametro callback desde el mf(header-header) para logout
    fnCerrarSession();
  },
  resetPasswordRedirect: function () {
    //Parametro callback desde el mf(header) para cambio contraseña
    fnResetPasswordRedirect();
  }
}

/**Parametros */
const data = {
  props: {
    authToken: "",
    params: toolbarAction
  }
}

const routes = constructRoutes(microfrontendLayout, data);
const applications = constructApplications({
  routes,
  loadApp({ name }) {
    const moduleMap = {
      "@mhcp/prg": () => import("mhcp_prg/prg"),
      "@mhcp/header": () => import("mhcp_header/header"),
      "@mhcp/seg": () => import("mhcp_seg/seg"),
      "@mhcp/adm": () => import("mhcp_adm/adm"),
      "@mhcp/pac": () => import("mhcp_pac/pac"),
      "@mhcp/apr": () => import("mhcp_apr/apr"),
    };
    return moduleMap[name]();
  },
});
const layoutEngine = constructLayoutEngine({ routes, applications });

applications.forEach(registerApplication);
layoutEngine.activate();

//#region MSAL
/**
 * @author ASW - Jhon Tovar
 * @description Logica para login con azure b2c msal.js 
 *  
 */

/**Configuracion b2c */
const authorities = {
  signUpSignIn: 'https://minhaciendalowenb2c.b2clogin.com/minhaciendalowenb2c.onmicrosoft.com/B2C_1_SIIFG3_SIGNIN_QAF-QA-ACP-PREPROD',
  resetPassword: 'https://minhaciendalowenb2c.b2clogin.com/minhaciendalowenb2c.onmicrosoft.com/B2C_1_SIIFG3_PASSWORDRESET_QAF-QA-ACP-PREPROD',
    redirectUri: '__redirectUri__',
};
/**variables del msal */
const msalConfig = {
  auth: {
    clientId: '__ClientId__',
    authority: authorities.signUpSignIn,
    knownAuthorities: ['minhaciendalowenb2c.b2clogin.com'],
    redirectUri: authorities.redirectUri,
    postLogoutRedirectUri: authorities.redirectUri
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    temporaryCacheLocation: BrowserCacheLocation.SessionStorage,
    claimsBasedCachingEnabled: true
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Trace,
      loggerCallback(logLevel, message) {
        //TODO: Pendiente eliminar
        console.info('msalConfig loggerCallback:', message);
      }
    }
  }
};

/**Nombre Variables de localstorage*/
const userStorage = 'mhcp-auth-user', tokenStorage = 'mhcp-auth-token', ingresoStorage = 'usuario', encodeStorage = '__encodeStorage__';
let oInterval = null, minutosValidacionToken = '5';

const msalInstance = new PublicClientApplication(msalConfig);
msalInstance.initialize();
msalInstance.handleRedirectPromise().then((tokenResponse) => {
  // Check if the tokenResponse is null
  if (tokenResponse !== null) {
    //then you are coming back from a successful authentication redirect.
    fnSeteoLocalStorage(tokenResponse);
    fnInterval();
    //Iniciar SPA
    start();
  }
  else if (getIsLoggin() && getExisteLocalSotrage()) {
    //validate is loggin
    fnInterval();
    //Iniciar SPA
    start();
  }
  else if (tokenResponse === null) {
    fnlogin();
  }
}).catch((error) => {
  //TODO: Pendiente eliminar
  console.log("handleRedirectPromise catch:", error);
  // handle error, either in the library or coming back from the server
  if (error && error.message.indexOf('AADB2C90091') > -1) {
    //evento de cancelar el restablecer la contraseña AADB2C90091
    fnlogin();
  }
}).finally((token) => {
  //TODO: Pendiente eliminar
  console.log("handleRedirectPromise finally:", token)
});


/**Seteo de variables en localstorage */
function fnSeteoLocalStorage(tokenResponse) {
  //auth Token
  window.localStorage.setItem(tokenStorage, tokenResponse.idToken);
  //auth User
  const sUser= JSON.stringify({
    localAccountId: tokenResponse.account.localAccountId,
    username: tokenResponse.account.name,
    nonce: tokenResponse.idTokenClaims.nonce,
    exp: tokenResponse.idTokenClaims.exp,
    auth_time: tokenResponse.idTokenClaims.auth_time
  });
  
  if(encodeStorage == 'true'){
    window.localStorage.setItem(userStorage, window.btoa(sUser));
  }else{
    window.localStorage.setItem(userStorage, sUser);
  }
}

/**Metodo para realizar el loginRedirect */
function fnlogin() {
  if (getIsLoggin()) {
    msalInstance.loginRedirect({ scopes: [] });
  } else {
    if(window.localStorage.getItem(userStorage)){
      fnRemoverLocalStorage();
      msalInstance.logoutRedirect();  
    }else{
      fnRemoverLocalStorage();
      msalInstance.loginRedirect({ scopes: [] });
    }
  }
}

/**Resetear password */
function fnResetPasswordRedirect() {
  const _resetpassword = {
    authority: authorities.resetPassword,
    scopes: [],
    redirectUri: authorities.redirectUri
  };
  msalInstance.loginRedirect(_resetpassword);
}

/**Validar si existe login en Navegdor */
function getIsLoggin() {
  return msalInstance.getAllAccounts().length > 0;
}

/** Validar si localstorage existe */
function getExisteLocalSotrage(){
 return window.localStorage.getItem(userStorage) && window.localStorage.getItem(tokenStorage); 
}

/**@deprecated se usa el metodo start() */
function fnUnloadApplication() {
  singleSpa.unloadApplication('@mhcp/header');
}

/**Metodo de cerrar sesion invocada con callback por parametros enviados al mf */
function fnCerrarSessionRedirect() {
  fnRemoverLocalStorage();
  msalInstance.logoutRedirect();
  clearInterval(oInterval);
}

/**Metodo de cerrar sesion invocada con callback por parametros enviados al mf */
function fnCerrarSession() {
  msalInstance.logoutRedirect({
    onRedirectNavigate: (url) => { return false; }
  });
  clearInterval(oInterval);
}

/**Metodo de limpiar las variables de localstorage */
function fnRemoverLocalStorage() {
  window.localStorage.removeItem(userStorage);
  window.localStorage.removeItem(tokenStorage);
  window.localStorage.removeItem(ingresoStorage);
}

/**
 * @author ASW - Jhon Tovar
 * @description Si el tiempo de expiracion es menor a 10 minutos se refresca el token
 */
function fnInterval() {
  try {
    oInterval = setInterval(() => {
      let user = window.localStorage.getItem(userStorage);
      if (encodeStorage == 'true') {
        user = window.atob(user);
      }
      user = JSON.parse(user);
      if (user.exp !== null) {
        if (new Date(user.exp * 1000) < new Date(Date.now() + (Number(minutosValidacionToken) * 60000))) {
          fnAquireTokenSSO();
        }
      }
    }, 60000);
  } catch (error) {
    console.error("fnInterval error:", error);
    clearInterval(oInterval);
  }
}

/**
 * @author ASW - Jhon Tovar
 * Metodo para obtener el token de forma silenciosa 
 */
async function fnAquireTokenSSO() {
  const account = msalInstance.getAllAccounts()[0];
  var request = {
    forceRefresh: true,
    account: account,
  };
  msalInstance.acquireTokenSilent(request)
    .then(async (tokenResponse) => {
      fnSeteoLocalStorage(tokenResponse);
    })
    .catch(async (error) => {
      if (error instanceof InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        await msalInstance.acquireTokenRedirect(request);
      }
    });
}
//#endregion