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
}: {
  text: string;
  styles: TemplateStyles;
}) {
  return (
    <>
      {text.split(/\r?\n/).map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const heading = /^##\s+(.+)$/.exec(trimmed);
        if (heading) {
          return (
            <Text key={i} style={styles.heading}>
              {heading[1]}
            </Text>
          );
        }
        const bulletContent = cvBulletContent(trimmed);
        const textNode = bulletContent ?? trimmed;
        const href = linkHref(textNode);
        if (href) {
          return (
            <Text key={i} style={[styles.paragraph, styles.bodyLink]}>
              <Link src={href}>{textNode}</Link>
            </Text>
          );
        }
        if (isCvBulletLine(trimmed)) {
          return (
            <Text key={i} style={[styles.paragraph, styles.bullet]}>
              {"\u2022 "}
              {textNode}
            </Text>
          );
        }
        return (
          <Text key={i} style={styles.paragraph}>
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
}: {
  text: string;
  header: CvHeader;
  template?: CvTemplateId;
  contactBlockText?: string | null;
}) {
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

  const contactBlock = detailLines.map((line, i) => {
    const href = linkHref(line);
    return (
      <Text key={i} style={href ? styles.contactLink : styles.contact}>
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {template === "modern" ? (
          <>
            <View style={styles.nameBand}>
              {nameBlock}
              {contactBlock}
            </View>
            <View style={styles.content}>
              <BodyContent text={text} styles={styles} />
            </View>
          </>
        ) : (
          <>
            {nameBlock}
            {contactBlock}
            <BodyContent text={text} styles={styles} />
          </>
        )}
      </Page>
    </Document>
  );
}
const clClassicStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
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
}: {
  text: string;
  template?: ClTemplateId;
  fullName?: string | null;
}) {
  const styles =
    template === "modern"
      ? clModernStyles
      : template === "compact"
        ? clCompactStyles
        : clClassicStyles;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, i) => (
      <Text key={i} style={styles.paragraph}>
        {paragraph}
      </Text>
    ));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paragraphs}
      </Page>
    </Document>
  );
}
