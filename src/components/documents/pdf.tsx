import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { cvBulletContent, isCvBulletLine, linkHref } from "@/lib/job/documents";
import type { ClTemplateId, CvTemplateId } from "@/lib/job/templates";

const classicStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contact: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 4,
  },
  contactLink: {
    fontSize: 9,
    color: "#1d4ed8",
    marginTop: 4,
    textDecoration: "underline",
  },
  heading: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 2,
  },
  bullet: {
    marginLeft: 10,
  },
  paragraph: {
    marginBottom: 4,
  },
  bodyLink: {
    color: "#2563eb",
    textDecoration: "underline",
  },
});

const faangpathStyles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28, // ~0.4 inches
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.15,
    color: "#000000",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontFamily: "Times-Bold",
  },
  contactContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  contact: {
    fontSize: 10,
    color: "#000000",
  },
  contactLink: {
    fontSize: 10,
    color: "#000000",
    textDecoration: "none",
  },
  heading: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingBottom: 2,
  },
  bullet: {
    marginLeft: 12,
  },
  paragraph: {
    marginBottom: 2,
  },
  bodyLink: {
    color: "#000000",
    textDecoration: "none",
  },
});

const modernStyles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1f2937",
  },
  content: {
    paddingTop: 18,
  },
  nameBand: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  contact: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 4,
  },
  contactLink: {
    fontSize: 9,
    color: "#1d4ed8",
    marginTop: 4,
    textDecoration: "underline",
  },
  heading: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 5,
    color: "#1d4ed8",
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#bfdbfe",
    paddingBottom: 2,
  },
  bullet: {
    marginLeft: 10,
  },
  paragraph: {
    marginBottom: 4,
  },
  bodyLink: {
    color: "#1d4ed8",
    textDecoration: "underline",
  },
});

const compactStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    color: "#111827",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  contact: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },
  contactLink: {
    fontSize: 8,
    color: "#1d4ed8",
    marginTop: 2,
    textDecoration: "underline",
  },
  heading: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 9,
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    paddingBottom: 1,
  },
  bullet: {
    marginLeft: 8,
  },
  paragraph: {
    marginBottom: 2,
  },
  bodyLink: {
    color: "#2563eb",
    textDecoration: "underline",
  },
});

type TemplateStyles = Record<string, Style>;

const TEMPLATE_STYLES: Record<CvTemplateId, TemplateStyles> = {
  classic: classicStyles,
  faangpath: faangpathStyles,
  modern: modernStyles,
  compact: compactStyles,
};

type CvHeader = {
  fullName: string | null;
  title: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
};

function BodyContent({
  text,
  styles,
}: Readonly<{
  text: string;
  styles: TemplateStyles;
}>) {
  return (
    <>
      {text.split(/\r?\n/).map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const lineKey = `body-${idx}`;
        const heading = /^##\s+(.*)/.exec(trimmed);
        if (heading) {
          return (
            <Text key={lineKey} style={styles.heading}>
              {heading[1]}
            </Text>
          );
        }
        const bulletContent = cvBulletContent(trimmed);
        const textNode = bulletContent ?? trimmed;
        const href = linkHref(textNode);
        if (href) {
          return (
            <Text key={lineKey} style={[styles.paragraph, styles.bodyLink]}>
              <Link src={href}>{textNode}</Link>
            </Text>
          );
        }
        if (isCvBulletLine(trimmed)) {
          return (
            <Text key={lineKey} style={[styles.paragraph, styles.bullet]}>
              {"\u2022 "}
              {textNode}
            </Text>
          );
        }
        return (
          <Text key={lineKey} style={styles.paragraph}>
            {textNode}
          </Text>
        );
      })}
    </>
  );
}

export function CvDocument({
  text,
  header,
  template = "classic",
  contactBlockText = null,
}: Readonly<{
  text: string;
  header: CvHeader;
  template?: CvTemplateId;
  contactBlockText?: string | null;
}>) {
  const styles = TEMPLATE_STYLES[template] ?? classicStyles;

  const contactLines = contactBlockText
    ? contactBlockText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [
      header.fullName,
      header.title,
      header.location,
      header.email,
      header.phone,
      header.github,
      header.linkedin,
    ].filter((line): line is string => Boolean(line));
  const [nameLine, ...detailLines] = contactLines;

  let bodyText = text;
  let tailoredTitle: string | null = null;
  const splitBody = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (splitBody.length > 0 && !splitBody[0].startsWith("##") && !splitBody[0].toLowerCase().includes("summary")) {
    tailoredTitle = splitBody[0].replace(/^#+\s*/, "");
    bodyText = splitBody.slice(1).join("\n");
  }

  const finalDetailLines = [...detailLines];
  if (tailoredTitle) {
    // Find the line that looks most like a title (usually index 0, non-contact info)
    const titleObjIndex = finalDetailLines.findIndex(l => !l.includes("@") && !l.includes("github.com") && !l.includes("linkedin.com") && !/\+?\d{8,}/.test(l));
    if (titleObjIndex !== -1) {
      finalDetailLines[titleObjIndex] = tailoredTitle;
    } else {
      finalDetailLines.unshift(tailoredTitle);
    }
  }

  const contactBlock = finalDetailLines.map((line, idx) => {
    const href = linkHref(line);
    const lineKey = `contact-${idx}`;
    return (
      <Text key={lineKey} style={href ? styles.contactLink : styles.contact}>
        {href ? (
          <Link src={href}>{line}</Link>
        ) : (
          line
        )}
      </Text>
    );
  });

  const nameBlock = nameLine ? (
    <Text style={styles.name}>{nameLine}</Text>
  ) : null;

  let Layout;
  if (template === "modern") {
    Layout = (
      <>
        <View style={styles.nameBand}>
          {nameBlock}
          {contactBlock}
        </View>
        <View style={styles.content}>
          <BodyContent text={bodyText} styles={styles} />
        </View>
      </>
    );
  } else if (template === "faangpath") {
    Layout = (
      <>
        <View style={(styles as TemplateStyles).headerContainer ?? {}}>
          {nameBlock}
          <View style={(styles as TemplateStyles).contactContainer ?? {}}>
            {contactBlock}
          </View>
        </View>
        <BodyContent text={bodyText} styles={styles} />
      </>
    );
  } else {
    Layout = (
      <>
        {nameBlock}
        {contactBlock}
        <BodyContent text={bodyText} styles={styles} />
      </>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {Layout}
      </Page>
    </Document>
  );
}
const clClassicStyles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28,
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#000000",
  },
  paragraph: {
    marginBottom: 4,
  },
});

const clModernStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
    borderTopWidth: 4,
    borderTopColor: "#2563eb",
  },
  paragraph: {
    marginBottom: 4,
  },
});

const clCompactStyles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    color: "#111827",
  },
  paragraph: {
    marginBottom: 2,
  },
});

export function CoverLetterDocument({
  text,
  template = "classic",
}: Readonly<{
  text: string;
  template?: ClTemplateId;
}>) {
  let styles: TemplateStyles = clClassicStyles as unknown as TemplateStyles;
  if (template === "modern") {
    styles = clModernStyles as unknown as TemplateStyles;
  } else if (template === "compact") {
    styles = clCompactStyles as unknown as TemplateStyles;
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, idx) => {
      const pKey = `para-${idx}`;
      return (
        <Text key={pKey} style={styles.paragraph}>
          {paragraph}
        </Text>
      );
    });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paragraphs}
      </Page>
    </Document>
  );
}
