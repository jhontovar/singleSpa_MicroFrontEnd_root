import { registerApplication, start } from "single-spa";
import {
  constructApplications,
  constructRoutes,
  constructLayoutEngine,
} from "single-spa-layout";
import microfrontendLayout from "./microfrontend-layout.html";

//const routes = constructRoutes(microfrontendLayout);

const htmlTemplate = document.querySelector('#single-spa-template')
const layoutData = {
  props: {
    authToken: "78sf9d0fds89-0fysdiuf6sf8X",
  },
  loaders: {
  }
};
const routes = constructRoutes(htmlTemplate, layoutData)

const applications = constructApplications({
  routes,
  loadApp({ name }) {
    return System.import(name);
  },
});
const layoutEngine = constructLayoutEngine({ routes, applications });

applications.forEach(registerApplication);
layoutEngine.activate();
start();
