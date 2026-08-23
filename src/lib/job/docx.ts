import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { prisma } from "@/lib/prisma";

export async function createDocxFromText(
    text: string,
    userId: string,
    includeHeader: boolean = true
): Promise<Buffer> {
    const paragraphs: Paragraph[] = [];

    let bodyText = text;
    let tailoredTitle: string | null = null;
    const splitBody = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (splitBody.length > 0 && !splitBody[0].startsWith("##") && !splitBody[0].toLowerCase().includes("summary")) {
        tailoredTitle = splitBody[0].replace(/^#+\s*/, "");
        bodyText = splitBody.slice(1).join("\n");
    }

    if (includeHeader) {
        const profile = await prisma.profile.findFirst({ where: { user: { clerkId: userId } } });
        if (profile) {
            const contactLines = [
                profile.fullName ?? "",
                profile.title ?? "",
                profile.location ?? "",
                profile.email ?? "",
                profile.phone ?? "",
                profile.github ?? "",
                profile.linkedin ?? "",
            ];

            const nameLine = contactLines[0];
            const detailLines = contactLines.slice(1).filter(Boolean);
            const finalDetailLines = [...detailLines];

            if (tailoredTitle) {
                if (profile.title) {
                    finalDetailLines[0] = tailoredTitle;
                } else {
                    finalDetailLines.unshift(tailoredTitle);
                }
            }

            if (nameLine) {
                paragraphs.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: nameLine, size: 32, font: "Times New Roman", bold: true })]
                }));
            }

            if (finalDetailLines.length > 0) {
                paragraphs.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: finalDetailLines.join("  |  "), size: 22, font: "Times New Roman" })],
                    spacing: { after: 200 }
                }));
            }
        }
    }

    const lines = bodyText.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim()) {
            paragraphs.push(new Paragraph({ children: [] }));
            continue;
        }

        if (line.startsWith("## ")) {
            paragraphs.push(new Paragraph({
                text: line.substring(3).trim(),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 }
            }));
        } else if (line.startsWith("# ")) {
            paragraphs.push(new Paragraph({
                text: line.substring(2).trim(),
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 120 }
            }));
        } else {
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun({
                        text: line,
                        size: 22, // 11pt
                        font: "Times New Roman"
                    })
                ]
            }));
        }
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: paragraphs
        }]
    });

    return (await Packer.toBuffer(doc)) as Buffer;
}
