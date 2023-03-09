import { NowRequest, NowResponse } from "@vercel/node"
import { getAuth } from "firebase-admin/auth"
import { db } from "../../../../firebase"
import { classRegistrationAdministrators } from "../../../util/permissions"
import { FieldValue } from "firebase-admin/firestore"
import { sendWelcomeEmail } from "../../../util/classes/sendWelcomeEmail"

export default async function approveFinancialAid(
  request: NowRequest,
  response: NowResponse
) {
  return response.status(501).json({
    success: false,
    messsage: "Registration is currently disabled.",
  });
  try {
    const {
      authToken,
      registrationId,
      email,
      firstName,
      lastName,
      preferredLanguage,
      level,
    } = request.body

    const authUser = await getAuth().verifyIdToken(authToken)
    if (!classRegistrationAdministrators.includes(authUser.uid)) {
      return response.status(403).json({
        success: false,
        message: "Insufficient permissions.",
      })
    }

    const joinLinkRef = db.collection("group-join-links").doc()
    await joinLinkRef.set({
      groupId:
        level === "beginner" ? "PWGnuF1siTzwfmG2K9x1" : "9q6RCWdqRYXkcrGgyZfZ",
      revoked: false,
      numUses: 0,
      maxUses: 1,
      expirationTime: null,
      usedBy: [],
      author: "REGISTRATION_" + email,
      id: joinLinkRef.id,
    })

    await Promise.all([
      sendWelcomeEmail({
        recipient: email,
        fname: firstName,
        lname: lastName,
        classLevel: level,
        joinLink: `https://usaco.guide/groups/join?key=${joinLinkRef.id}`,
      }),
      db
        .collection("classes-registration")
        .doc("2022october")
        .collection("registrations")
        .doc(registrationId)
        .update({
          status: "ACCEPTED",
          acceptedBy: authUser.uid,
          acceptedTimestamp: FieldValue.serverTimestamp(),
          joinLink: `https://usaco.guide/groups/join?key=${joinLinkRef.id}`,
        }),
    ])

    return response.status(200).json({
      success: true,
      message: "Financial Aid successfully granted",
      joinLink: `https://usaco.guide/groups/join?key=${joinLinkRef.id}`,
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
