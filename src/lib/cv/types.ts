export type CvSkill = {
  name: string;
  level?: string | null;
  years?: number | null;
};

export type CvExperience = {
  company?: string | null;
  title?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  current?: boolean;
  description?: string | null;
  highlights?: string[];
};

export type CvEducation = {
  institution?: string | null;
  degree?: string | null;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
};

export type CvProject = {
  name?: string | null;
  description?: string | null;
  url?: string | null;
  technologies?: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export type CvCertification = {
  name?: string | null;
  issuer?: string | null;
  date?: string | null;
  url?: string | null;
};

export type CvParsedProfile = {
  fullName?: string | null;
  title?: string | null;
  summary?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  github?: string | null;
  linkedin?: string | null;
  skills?: CvSkill[];
  experiences?: CvExperience[];
  educations?: CvEducation[];
  projects?: CvProject[];
  certifications?: CvCertification[];
};