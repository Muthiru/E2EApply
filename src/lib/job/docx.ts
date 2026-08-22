import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { prisma } from "@/lib/prisma";
import { extractMasterCvContactBlock } from "@/lib/job/documents";

export async function createDocxFromText(
    text: string,
    userId: string,
    includeHeader: boolean = true
): Promise<Buffer> {
    const paragraphs: Paragraph[] = [];

    if (includeHeader) {
        const profile = await prisma.profile.findFirst({ where: { user: { clerkId: userId } } });
        if (profile) {
            let contactBlock = "";
            if (profile.github) {
                const parts = profile.github.split("/");
                const handle = parts[parts.length - 1];
                if (handle) {
                    const mCv = await prisma.masterCv.findFirst({
                        where: { profileId: profile.id, textContent: { contains: handle } },
                        orderBy: { createdAt: "desc" }
                    });
                    if (mCv?.textContent) {
                        contactBlock = extractMasterCvContactBlock(mCv.textContent) ?? "";
                    }
                }
            }
            if (!contactBlock) {
                const mCv = await prisma.masterCv.findFirst({
                    where: { profileId: profile.id },
                    orderBy: { createdAt: "desc" }
                });
                if (mCv?.textContent) {
                    contactBlock = extractMasterCvContactBlock(mCv.textContent) ?? "";
                }
            }

            if (contactBlock) {
                const lines = contactBlock.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                for (const line of lines) {
                    paragraphs.push(new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: line, size: 24, font: "Times New Roman" })]
                    }));
                }
                paragraphs.push(new Paragraph({ text: "", spacing: { after: 200 } }));
            }
        }
    }

    const lines = text.split(/\r?\n/);

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
