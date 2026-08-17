import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";

const styles = StyleSheet.create({
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
});

type CvHeader = {
  fullName: string | null;
  title: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
};

export function CvDocument({ text, header }: { text: string; header: CvHeader }) {
  const contactParts = [
    header.title,
    header.location,
    header.email,
    header.phone,
    header.github,
    header.linkedin,
  ].filter((part): part is string => Boolean(part));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {header.fullName && <Text style={styles.name}>{header.fullName}</Text>}
        {contactParts.length > 0 && (
          <Text style={styles.contact}>{contactParts.join("  ·  ")}</Text>
        )}
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
          if (trimmed.startsWith("- ")) {
            return (
              <Text key={i} style={[styles.paragraph, styles.bullet]}>
                {trimmed.slice(2)}
              </Text>
            );
          }
          return (
            <Text key={i} style={styles.paragraph}>
              {trimmed}
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}

export function CoverLetterDocument({ text }: { text: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {text
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <Text key={i} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
      </Page>
    </Document>
  );
}