import { domainNamespace } from "./config";

// Reserve one PostgreSQL schema per approved product domain. Tables are added
// here through their owning module as the backend slices are implemented.
export const mediaNamespace = domainNamespace("media");
export const feedNamespace = domainNamespace("feed");
export const messagesNamespace = domainNamespace("messages");
export const notificationsNamespace = domainNamespace("notifications");
export const searchNamespace = domainNamespace("search");
export const locationNamespace = domainNamespace("location");
export const shopNamespace = domainNamespace("shop");
export const trustSafetyNamespace = domainNamespace("trust_safety");
