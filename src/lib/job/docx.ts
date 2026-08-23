import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { prisma } from "@/lib/prisma";

function buildHeaderParagraphs(
    nameLine: string,
    detailLines: string[],
    tailoredTitle: string | null,
    profileTitle: string | null,
): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const finalLines = [...detailLines];

    if (tailoredTitle) {
        if (profileTitle) {
            finalLines[0] = tailoredTitle;
        } else {
            finalLines.unshift(tailoredTitle);
        }
    }

    if (nameLine) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: nameLine, size: 32, font: "Times New Roman", bold: true })],
            spacing: { after: 80 }
        }));
    }

    if (finalLines.length > 0) {
        paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: finalLines.join(" | "), size: 20, font: "Times New Roman" })],
            spacing: { after: 200 }
        }));
    }

    return paragraphs;
}

function extractTailoredTitle(text: string): { tailoredTitle: string | null; bodyText: string } {
    const splitBody = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (splitBody.length > 0 && !splitBody[0].startsWith("##") && !splitBody[0].toLowerCase().includes("summary")) {
        return {
            tailoredTitle: splitBody[0].replace(/^#+\s*/, ""),
            bodyText: splitBody.slice(1).join("\n"),
        };
    }
    return { tailoredTitle: null, bodyText: text };
}

function lineToDocxParagraph(line: string): Paragraph {
    if (line.startsWith("## ")) {
        return new Paragraph({
            text: line.substring(3).trim(),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
        });
    }
    if (line.startsWith("# ")) {
        return new Paragraph({
            text: line.substring(2).trim(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 120 }
        });
    }
    return new Paragraph({
        children: [
            new TextRun({
                text: line,
                size: 22,
                font: "Times New Roman"
            })
        ]
    });
}

export async function createDocxFromText(
    text: string,
    userId: string,
    includeHeader: boolean = true
): Promise<Buffer> {
    const { tailoredTitle, bodyText } = extractTailoredTitle(text);

    let headerParagraphs: Paragraph[] = [];
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
            headerParagraphs = buildHeaderParagraphs(nameLine, detailLines, tailoredTitle, profile.title);
        }
    }

    const bodyParagraphs = bodyText.split(/\r?\n/).map((line) => {
        if (!line.trim()) return new Paragraph({ children: [] });
        return lineToDocxParagraph(line);
    });

    const doc = new Document({
        sections: [{
            properties: {},
            children: [...headerParagraphs, ...bodyParagraphs]
        }]
    });

    return (await Packer.toBuffer(doc)) as Buffer;
}
