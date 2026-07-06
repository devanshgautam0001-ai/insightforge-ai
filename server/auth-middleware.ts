import { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "./firebase-admin.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    role: string;
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
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || "";
    const name = decodedToken.name || email.split("@")[0] || "User";

    // Retrieve or dynamically sync user from Firestore collection
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    let dbUser: any = null;

    if (!userDoc.exists) {
      let signInProvider = "password";
      try {
        const userRecord = await adminAuth.getUser(uid);
        signInProvider = decodedToken.firebase?.sign_in_provider || (userRecord.providerData?.[0]?.providerId === "google.com" ? "google.com" : "password");
      } catch (err) {
        console.error("Failed to fetch Firebase user record details:", err);
      }

      const isGoogle = signInProvider === "google.com";
      const provider = isGoogle ? "google" : "password";

      // If database has NO Super Admin: Create ONLY ONE Super Admin.
      // ELSE: Every newly registered account MUST be created as ANALYST.
      let assignedRole = "ANALYST";
      const superAdminsQuery = await adminDb.collection("users").where("role", "==", "SUPER_ADMIN").limit(1).get();
      if (superAdminsQuery.empty) {
        assignedRole = "SUPER_ADMIN";
      }

      const now = new Date();
      dbUser = {
        uid,
        email,
        name,
        photoURL: decodedToken.picture || null,
        role: assignedRole,
        provider,
        theme: "dark",
        language: "en",
        isEmailVerified: decodedToken.email_verified || false,
        createdAt: now,
        updatedAt: now,
        lastLogin: now,
      };

      await userDocRef.set(dbUser);

      // Store role inside JWT custom claims
      try {
        await adminAuth.setCustomUserClaims(uid, { role: assignedRole });
      } catch (claimErr) {
        console.error("Failed to set Firebase custom claims for new user:", claimErr);
      }
    } else {
      dbUser = userDoc.data();
      // Sync JWT custom claims if they differ from database source of truth
      if (decodedToken.role !== dbUser.role) {
        try {
          await adminAuth.setCustomUserClaims(uid, { role: dbUser.role });
        } catch (claimErr) {
          console.error("Failed to sync Firebase custom claims for user:", claimErr);
        }
      }

      // Update lastLogin on every successful session verification
      await userDocRef.update({
        lastLogin: new Date(),
        isEmailVerified: decodedToken.email_verified || false,
      });
    }

    req.user = {
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name || undefined,
      role: dbUser.role,
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
