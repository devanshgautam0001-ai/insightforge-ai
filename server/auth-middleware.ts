import { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "./firebase-admin.ts";
import { verifyToken } from "./token-verifier.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    role: string;
    photoURL?: string | null;
    company?: string;
    designation?: string;
    country?: string;
    theme: string;
    language: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if (req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token in authorization header or query" });
  }

  try {
    const decodedToken = await verifyToken(token);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || "").toLowerCase();
    const name = req.body?.displayName || decodedToken.name || email.split("@")[0] || "User";

    // Retrieve or dynamically sync user from Firestore collection
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    let dbUser: any = null;

    // Enforce role policies
    const targetIsSuperAdminEmail = email === "devanshgautam0001@gmail.com";

    if (!userDoc.exists) {
      const signInProvider = decodedToken.firebase?.sign_in_provider || "password";
      const isGoogle = signInProvider === "google.com";
      const provider = isGoogle ? "google" : "password";

      // Every newly registered account MUST be created as VIEWER, unless they are the Super Admin email.
      const assignedRole = targetIsSuperAdminEmail ? "SUPER_ADMIN" : "VIEWER";

      const now = new Date();
      dbUser = {
        uid,
        id: uid,
        email,
        name,
        displayName: name,
        photoURL: decodedToken.picture || null,
        role: assignedRole,
        provider,
        theme: "dark",
        language: "en",
        isEmailVerified: decodedToken.email_verified || false,
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
        active: true,
      };

      await userDocRef.set(dbUser);

      // Store role inside JWT custom claims
      try {
        await adminAuth.setCustomUserClaims(uid, { role: assignedRole });
      } catch (claimErr: any) {
        console.warn("Notice: Custom claims skipped for new user in sandbox:", claimErr?.message || claimErr);
      }
    } else {
      dbUser = userDoc.data();
      let roleChanged = false;

      // Ensure devanshgautam0001@gmail.com is SUPER_ADMIN
      if (targetIsSuperAdminEmail && dbUser.role !== "SUPER_ADMIN") {
        dbUser.role = "SUPER_ADMIN";
        roleChanged = true;
      }
      // Demote other emails who somehow became SUPER_ADMIN
      else if (!targetIsSuperAdminEmail && dbUser.role === "SUPER_ADMIN") {
        dbUser.role = "ADMIN";
        roleChanged = true;
      }

      // Sync JWT custom claims if they differ from database source of truth
      if (decodedToken.role !== dbUser.role || roleChanged) {
        try {
          await adminAuth.setCustomUserClaims(uid, { role: dbUser.role });
        } catch (claimErr: any) {
          console.warn("Notice: Custom claims sync skipped in sandbox:", claimErr?.message || claimErr);
        }
      }

      const updates: any = {
        lastLogin: new Date(),
        isEmailVerified: decodedToken.email_verified || false,
      };
      if (roleChanged) {
        updates.role = dbUser.role;
      }

      await userDocRef.update(updates);
    }

    req.user = {
      uid: dbUser.uid,
      id: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name || undefined,
      displayName: dbUser.displayName || dbUser.name || undefined,
      role: dbUser.role,
      photoURL: dbUser.photoURL || null,
      company: dbUser.company || undefined,
      designation: dbUser.designation || undefined,
      country: dbUser.country || undefined,
      theme: dbUser.theme || "dark",
      language: dbUser.language || "en",
    };

    next();
  } catch (error: any) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};
