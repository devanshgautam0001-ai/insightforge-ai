import jwt from "jsonwebtoken";
import { adminAuth } from "./firebase-admin.ts";
import firebaseConfig from "../firebase-applet-config.json";

export interface DecodedIdToken {
  aud: string;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  exp: number;
  firebase: {
    identities: {
      [key: string]: any;
    };
    sign_in_provider: string;
    [key: string]: any;
  };
  iat: number;
  iss: string;
  name?: string;
  phone_number?: string;
  picture?: string;
  sub: string;
  uid: string;
  role?: string;
  [key: string]: any;
}

// In-memory cache for public certificates
interface CertsCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let cachedCerts: CertsCache | null = null;

async function fetchPublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.certs;
  }

  const url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch public keys: HTTP status ${res.status}`);
    }
    const certs = await res.json();
    
    // Cache for 1 hour
    cachedCerts = {
      certs,
      expiresAt: now + 3600 * 1000,
    };
    return certs;
  } catch (error) {
    // If cache exists, fall back to it on error to handle network glitches gracefully
    if (cachedCerts) {
      console.warn("Using stale public keys cache due to fetch failure:", error);
      return cachedCerts.certs;
    }
    throw error;
  }
}

export async function verifyToken(token: string): Promise<DecodedIdToken> {
  // 1. Try Firebase Admin verifyIdToken first
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded as DecodedIdToken;
  } catch (firebaseErr: any) {
    console.warn("Firebase Admin verifyIdToken failed, attempting custom fallback verification:", firebaseErr.message || firebaseErr);
    
    // If the error isn't connection/internal-error related, we could rethrow, but let's try custom verification as a robust absolute fallback
    try {
      // 2. Decode token header to get 'kid'
      const decodedUnverified = jwt.decode(token, { complete: true });
      if (!decodedUnverified || typeof decodedUnverified === "string") {
        throw new Error("Invalid token structure");
      }

      const kid = decodedUnverified.header?.kid;
      if (!kid) {
        throw new Error("Token is missing key identifier (kid)");
      }

      // 3. Fetch current Google public keys
      const certs = await fetchPublicKeys();
      const cert = certs[kid];
      if (!cert) {
        throw new Error("Token matches no registered public key");
      }

      // 4. Verify signature & basic JWT claims
      const projectId = firebaseConfig.projectId;
      const expectedIssuer = `https://securetoken.google.com/${projectId}`;
      
      const payload = jwt.verify(token, cert, {
        algorithms: ["RS256"],
        audience: projectId,
        issuer: expectedIssuer,
      }) as any;

      // 5. Structure payload to match DecodedIdToken
      const decodedToken: DecodedIdToken = {
        aud: payload.aud,
        auth_time: payload.auth_time,
        email: payload.email,
        email_verified: payload.email_verified,
        exp: payload.exp,
        firebase: payload.firebase || {
          identities: {},
          sign_in_provider: "password"
        },
        iat: payload.iat,
        iss: payload.iss,
        name: payload.name,
        phone_number: payload.phone_number,
        picture: payload.picture,
        sub: payload.sub,
        uid: payload.sub, // uid is mapped from sub
        role: payload.role, // custom claim mapping
        ...payload
      };

      console.log("Custom fallback token verification succeeded for uid:", decodedToken.uid);
      return decodedToken;
    } catch (fallbackErr: any) {
      console.error("Custom fallback verification also failed:", fallbackErr.message || fallbackErr);
      throw firebaseErr; // Throw original firebase verification error if fallback also fails
    }
  }
}
