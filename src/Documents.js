import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  Grid,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Alert
} from "@mui/material";
import {
  Visibility,
  Download,
  Close,
  PictureAsPdf,
  Image,
  Description,
  Search,
  SmartToy
} from "@mui/icons-material";


import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

// Mock documents data for demonstration
const mockDocuments = [
  {
    id: 1,
    title: "Medical Report of Anuj",
    type: "pdf",
    patient: "Anuj Pratap",
    category: "results",
    aiSummary: {
      overview: "Health report of Anuj showing key metrics and observations.",
      vitals: [
        { name: "Hemoglobin", value: "15.1 g/dL", normalRange: "13–17 g/dL", status: "Normal" },
        { name: "WBC Count", value: "6,200 /μL", normalRange: "4,000–11,000 /μL", status: "Normal" },
        { name: "Platelet Count", value: "200,000 /μL", normalRange: "150,000–450,000 /μL", status: "Normal" },
        { name: "Blood Sugar (Fasting)", value: "95 mg/dL", normalRange: "70–100 mg/dL", status: "Normal" },
        { name: "Cholesterol (Total)", value: "205 mg/dL", normalRange: "< 200 mg/dL", status: "High" }
      ],
      analysis: [
        "Values indicate no immediate critical health concern.",
        "Further evaluation might be needed for borderline results.",
        "Overall, patient is stable based on current data."
      ],
      recommendations: [
        "Repeat test in 2 weeks.",
        "Maintain a balanced diet.",
        "Consult a specialist if symptoms persist."
      ]
    },
    url: "https://drive.google.com/file/d/1hpWcmIXJLV9q0iyKMDw4VPNYFmQQkonJ/view?usp=drive_link",
    previewUrl: "https://drive.google.com/file/d/1hpWcmIXJLV9q0iyKMDw4VPNYFmQQkonJ/preview",
    size: "196 KB",
    updatedAt: "2025-06-04T00:00:00"
  },
  {
    id: 2,
    title: "CT Scan Report of Priya",
    type: "jpg",
    patient: "Priya Sharma",
    category: "imaging",
    aiSummary: {
      overview: "CT scan revealing minor sinus inflammation.",
      vitals: [],
      analysis: [
        "No signs of structural abnormality.",
        "Minor inflammation in sinus cavities."
      ],
      recommendations: [
        "Consult ENT specialist.",
        "Use prescribed nasal sprays."
      ]
    },
    url: "https://drive.google.com/file/d/1z6Mdl_OT11zF7GozE9QbNh07Ae-KoPIK/view?usp=drive_link",
    previewUrl: "https://drive.google.com/file/d/1z6Mdl_OT11zF7GozE9QbNh07Ae-KoPIK/preview",
    size: "74 KB",
    updatedAt: "2025-05-07T00:00:00"
  },
  {
    id: 3,
    title: "Blood Report of Rahul",
    type: "pdf",
    patient: "Rahul Verma",
    category: "results",
    aiSummary: {
      overview: "Routine blood test with slightly elevated cholesterol.",
      vitals: [
        { name: "Hemoglobin", value: "14.3 g/dL", normalRange: "13–17 g/dL", status: "Normal" },
        { name: "Cholesterol", value: "210 mg/dL", normalRange: "< 200 mg/dL", status: "High" }
      ],
      analysis: ["Mild hypercholesterolemia detected."],
      recommendations: ["Adopt low-fat diet.", "Retest after 1 month."]
    },
    url: "https://drive.google.com/file/d/1aYqO0bXeK_8rVqAlJybUOF4tWkq1uCPQ/view?usp=drive_link",
    previewUrl: "https://drive.google.com/file/d/1aYqO0bXeK_8rVqAlJybUOF4tWkq1uCPQ/preview",
    size: "467 KB",
    updatedAt: "2025-04-20T00:00:00"
  },
  {
    id: 4,
    title: "MRI Report of Sanya",
    type: "docx",
    patient: "Sanya Roy",
    category: "imaging",
    aiSummary: {
      overview: "MRI shows no abnormalities in brain scan.",
      vitals: [],
      analysis: ["Normal MRI scan; no signs of trauma or lesions."],
      recommendations: ["No immediate action required."]
    },
    url: "https://docs.google.com/document/d/1xZkGD-NUNj-h4winXcLPnXEi80Ilz2Sa/edit?usp=sharing",
    previewUrl: "https://docs.google.com/document/d/1xZkGD-NUNj-h4winXcLPnXEi80Ilz2Sa/preview",
    size: "16 KB",
    updatedAt: "2025-03-28T00:00:00"
  },
  {
    id: 5,
    title: "Liver Function Test - Abhishek",
    type: "pdf",
    patient: "Abhishek Singh",
    category: "results",
    aiSummary: {
      overview: "LFT showing elevated SGPT and SGOT levels.",
      vitals: [
        { name: "SGPT", value: "60 U/L", normalRange: "7–56 U/L", status: "High" },
        { name: "SGOT", value: "58 U/L", normalRange: "5–40 U/L", status: "High" }
      ],
      analysis: ["Indicates possible liver inflammation or fatty liver."],
      recommendations: ["Reduce alcohol intake.", "Ultrasound advised."]
    },
    url: "https://drive.google.com/file/d/19Gbnm1hi-bV2YfI51V4gNXLRBkwgp398/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/19Gbnm1hi-bV2YfI51V4gNXLRBkwgp398/preview",
    size: "453 KB",
    updatedAt: "2025-06-01T00:00:00"
  },
  {
    id: 6,
    title: "X-ray Chest - Manish",
    type: "png",
    patient: "Manish Kumar",
    category: "imaging",
    aiSummary: {
      overview: "X-ray indicates clear lungs and no abnormalities.",
      vitals: [],
      analysis: ["Lung fields are normal.", "No evidence of fluid or mass."],
      recommendations: ["No further action necessary."]
    },
    url: "https://drive.google.com/file/d/1y4LtjnwKWRywkPEVX_WK5JzGiVYCPHqe/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/1y4LtjnwKWRywkPEVX_WK5JzGiVYCPHqe/preview",
    size: "117 KB",
    updatedAt: "2025-06-05T00:00:00"
  },
  {
    id: 7,
    title: "ECG Report - Reena",
    type: "jpeg",
    patient: "Reena Mishra",
    category: "reports",
    aiSummary: {
      overview: "ECG shows normal sinus rhythm.",
      vitals: [],
      analysis: ["No arrhythmia or abnormalities noted."],
      recommendations: ["Routine follow-up after 6 months."]
    },
    url: "https://drive.google.com/file/d/11UcHiRKANBUZXGusw8lm6h6QW77EEIzp/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/11UcHiRKANBUZXGusw8lm6h6QW77EEIzp/preview",
    size: "138 KB",
    updatedAt: "2025-05-15T00:00:00"
  },
  {
    id: 8,
    title: "Eye Test Report - Kunal",
    type: "pdf",
    patient: "Kunal Das",
    category: "reports",
    aiSummary: {
      overview: "Visual acuity report for both eyes.",
      vitals: [],
      analysis: ["Mild myopia in left eye."],
      recommendations: ["Prescription glasses recommended."]
    },
    url: "https://drive.google.com/file/d/12Tc6MsZdNEkPOeK6ZiaNNsCgzlGRwv5f/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/12Tc6MsZdNEkPOeK6ZiaNNsCgzlGRwv5f/preview",
    size: "453 KB",
    updatedAt: "2025-06-03T00:00:00"
  },
  {
    id: 9,
    title: "Thyroid Report of Sneha",
    type: "docx",
    patient: "Sneha Chatterjee",
    category: "results",
    aiSummary: {
      overview: "TSH slightly above normal range.",
      vitals: [
        { name: "TSH", value: "6.0 µIU/mL", normalRange: "0.4–4.0 µIU/mL", status: "High" }
      ],
      analysis: ["Suggestive of subclinical hypothyroidism."],
      recommendations: ["Monitor every 3 months.", "Consider endocrinologist consult."]
    },
    url: "https://docs.google.com/document/d/1zU9uE-cyn57P-oKK9WwEv_pTLZWzwHCz/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/1zU9uE-cyn57P-oKK9WwEv_pTLZWzwHCz/preview",
    size: "17 KB",
    updatedAt: "2025-06-06T00:00:00"
  },
  {
    id: 10,
    title: "CBC Report - Tanmay",
    type: "pdf",
    patient: "Tanmay Dey",
    category: "results",
    aiSummary: {
      overview: "Complete blood count mostly within range.",
      vitals: [
        { name: "WBC", value: "5,500 /μL", normalRange: "4,000–11,000 /μL", status: "Normal" },
        { name: "RBC", value: "4.9 million/μL", normalRange: "4.5–6 million/μL", status: "Normal" }
      ],
      analysis: ["Healthy hematologic profile."],
      recommendations: ["Maintain hydration.", "Routine annual checkup."]
    },
    url: "https://drive.google.com/file/d/1LAGziFTmffXY398ekJqUzba73s5RcD5Q/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/1LAGziFTmffXY398ekJqUzba73s5RcD5Q/preview",
    size: "454 KB",
    updatedAt: "2025-05-30T00:00:00"
  },
  {
    id: 11,
    title: "Ultrasound Abdomen - Aditya",
    type: "jpeg",
    patient: "Aditya Mehta",
    category: "imaging",
    aiSummary: {
      overview: "Abdominal ultrasound normal except mild fatty liver.",
      vitals: [],
      analysis: ["Grade 1 fatty liver.", "Other organs appear normal."],
      recommendations: ["Lifestyle modification.", "Low-fat diet."]
    },
    url: "https://drive.google.com/file/d/18XfMAkxMmaMZN8Dt_RDQsgnui7v8sLeT/view?usp=sharing",
    previewUrl: "https://drive.google.com/file/d/18XfMAkxMmaMZN8Dt_RDQsgnui7v8sLeT/preview",
    size: "150 KB",
    updatedAt: "2025-06-02T00:00:00"
  }
];

const categories = ["all", "reports", "imaging", "results"];

const typeIcons = {
  pdf: <PictureAsPdf color="error" />,
  docx: <Description color="primary" />,
  jpeg: <Image color="secondary" />,
  jpg: <Image color="secondary" />,
  png: <Image color="secondary" />,
  default: <Description />
};

function formatDate(dateString) {
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return "";
  return `${String(dateObj.getDate()).padStart(2, "0")}-${String(
    dateObj.getMonth() + 1
  ).padStart(2, "0")}-${dateObj.getFullYear()}`;
}

const Documents = () => {
  // State
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter/sort/search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("nameAsc");
  const [categoryBy, setCategoryBy] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch mock data (replace with Firestore fetch in real app)
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setDocuments(mockDocuments);
      setLoading(false);
    }, 800);
  }, []);

  // Fetch documents from Firestore
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'documents'));
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDocuments(docs);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents');
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Add a new document to Firestore
  const addDocument = async (documentData) => {
    try {
      const docRef = await addDoc(collection(db, 'documents'), {
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setDocuments(prev => [...prev, { id: docRef.id, ...documentData }]);
      return docRef.id;
    } catch (err) {
      console.error('Error adding document:', err);
      throw new Error('Failed to add document');
    }
  };

   // Update a document in Firestore
  const updateDocument = async (documentId, updatedData) => {
    try {
      const documentRef = doc(db, 'documents', documentId);
      await updateDoc(documentRef, {
        ...updatedData,
        updatedAt: new Date()
      });
      
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, ...updatedData } : doc
        )
      );
    } catch (err) {
      console.error('Error updating document:', err);
      throw new Error('Failed to update document');
    }
  };

  // Delete a document from Firestore
  const deleteDocument = async (documentId) => {
    try {
      await deleteDoc(doc(db, 'documents', documentId));
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Error deleting document:', err);
      throw new Error('Failed to delete document');
    }
  };

  // Get documents by patient ID
  const getPatientDocuments = async (patientId) => {
    try {
      const q = query(
        collection(db, 'documents'),
        where('patientId', '==', patientId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      console.error('Error fetching patient documents:', err);
      throw new Error('Failed to fetch patient documents');
    }
  };

  // Filtering
  let filteredDocs = documents;
  if (categoryBy !== "all") {
    filteredDocs = filteredDocs.filter(
      (doc) => doc.category && doc.category === categoryBy
    );
  }
  if (searchQuery.trim() !== "") {
    filteredDocs = filteredDocs.filter((doc) => {
      const q = searchQuery.toLowerCase();
      if (searchBy === "all") {
        return (
          (doc.title && doc.title.toLowerCase().includes(q)) ||
          (doc.patient && doc.patient.toLowerCase().includes(q)) ||
          (doc.type && doc.type.toLowerCase().includes(q))
        );
      }
      if (searchBy === "name") {
        return doc.title && doc.title.toLowerCase().includes(q);
      }
      if (searchBy === "patient") {
        return doc.patient && doc.patient.toLowerCase().includes(q);
      }
      if (searchBy === "type") {
        return doc.type && doc.type.toLowerCase().includes(q);
      }
      return false;
    });
  }

  // Sorting
  filteredDocs = [...filteredDocs].sort((a, b) => {
    switch (sortBy) {
      case "nameAsc":
        return (a.title || "").localeCompare(b.title || "");
      case "nameDec":
        return (b.title || "").localeCompare(a.title || "");
      case "patientAsc":
        return (a.patient || "").localeCompare(b.patient || "");
      case "patientDec":
        return (b.patient || "").localeCompare(a.patient || "");
      case "dateAsc":
        return new Date(a.updatedAt) - new Date(b.updatedAt);
      case "dateDec":
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case "sizeAsc":
        return (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0);
      case "sizeDec":
        return (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocs = filteredDocs.slice(startIndex, endIndex);

  // Animation ref (optional, not used here)
  const cardsContainerRef = useRef(null);

  // Reset to page 1 if filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchBy, sortBy, categoryBy]);

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 2 }, borderRadius: 2, bgcolor: "background.paper" }}>
      {/* Controls */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2, mb: 4 }}>
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, flex: 1 }}>
          <Box>
            <Typography fontWeight="bold" component="span" sx={{ px: 2 }}>
              Search By
            </Typography>
            <Select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              size="small"
              sx={{ minWidth: 140, ml: 1 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="name">Document Name</MenuItem>
              <MenuItem value="patient">Patient Name</MenuItem>
              <MenuItem value="type">Document Type</MenuItem>
            </Select>
          </Box>
          <Box>
            <Typography fontWeight="bold" component="span" sx={{ px: 2 }}>
              Sort By
            </Typography>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              size="small"
              sx={{ minWidth: 180, ml: 1 }}
            >
              <MenuItem value="nameAsc">Document Name (A-Z)</MenuItem>
              <MenuItem value="nameDec">Document Name (Z-A)</MenuItem>
              <MenuItem value="patientAsc">Patient Name (A-Z)</MenuItem>
              <MenuItem value="patientDec">Patient Name (Z-A)</MenuItem>
              <MenuItem value="dateAsc">Date (Oldest)</MenuItem>
              <MenuItem value="dateDec">Date (Newest)</MenuItem>
              <MenuItem value="sizeAsc">Size (Smallest)</MenuItem>
              <MenuItem value="sizeDec">Size (Largest)</MenuItem>
            </Select>
          </Box>
        </Box>
        <Box sx={{ flex: 2, display: "flex", alignItems: "center", mt: { xs: 2, lg: 0 } }}>
          <Search sx={{ mr: 1 }} />
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder="Search Document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
      </Box>

      {/* Category Tabs */}
      <Tabs
        value={categories.indexOf(categoryBy)}
        onChange={(_, idx) => setCategoryBy(categories[idx])}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map((cat) => (
          <Tab key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)} />
        ))}
      </Tabs>

      {/* Error State */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 10 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading documents...</Typography>
        </Box>
      ) : (
        <>
          {/* Cards */}
          <Grid container spacing={2} ref={cardsContainerRef}>
            {currentDocs.length > 0 ? (
              currentDocs.map((doc) => (
                <Grid key={doc.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <DocumentCard doc={doc} />
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Typography align="center" variant="h6" sx={{ mt: 4 }}>
                  {documents.length === 0
                    ? "No documents found in database."
                    : "No documents match your search criteria."}
                </Typography>
                {documents.length === 0 && (
                  <Typography align="center" variant="body2" color="text.secondary">
                    Make sure your Firestore collection 'documents' contains data.
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, mt: 4 }}>
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outlined"
              >
                Prev
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  variant={currentPage === i + 1 ? "contained" : "outlined"}
                  color={currentPage === i + 1 ? "primary" : "inherit"}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outlined"
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

const DocumentCard = ({ doc }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const avatar = doc.patient
    ? doc.patient
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0]?.toUpperCase() || "")
      .join("")
    : "";

  return (
    <>
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ fontSize: 32 }}>
              {typeIcons[doc.type] || typeIcons.default}
            </Box>
            <Typography variant="h6" noWrap>
              {doc.title || "Medical Report"}
            </Typography>
          </Box>
          <Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center" }}>
            {doc.type && (
              <Typography
                variant="caption"
                sx={{ bgcolor: "grey.200", px: 1, borderRadius: 1 }}
              >
                {doc.type}
              </Typography>
            )}
            {doc.size && <Typography variant="caption">{doc.size}</Typography>}
          </Box>
          {doc.patient && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: "bold" }}>
                {avatar}
              </Avatar>
              <Typography variant="body1">{doc.patient}</Typography>
            </Box>
          )}
          {doc.updatedAt && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Updated: {formatDate(doc.updatedAt)}
            </Typography>
          )}
        </CardContent>
        <CardActions
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            justifyContent: "space-between",
            alignItems: "stretch", // Ensures buttons fill the height in row layout
            p: 1
          }}
        >
          {doc.previewUrl && (
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ minHeight: 48,  }}
              onClick={() => setIsViewerOpen(true)}
            >
              View
            </Button>
          )}
          {doc.url && (
            <Button
              variant="contained"
              color="success"
              size="large"
              sx={{ minHeight: 48 }}
              onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
            >
              Download
            </Button>
          )}
          {doc.aiSummary && (
            <Button
              variant="contained"
              color="warning"
              size="large"
              sx={{ minHeight: 48 }}
              onClick={() => setIsAIAssistantOpen(true)}
            >
              Ask AI
            </Button>
          )}
        </CardActions>

      </Card>

      {/* Viewer Modal */}
      <Dialog open={isViewerOpen} onClose={() => setIsViewerOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Document Preview
          <IconButton
            aria-label="close"
            onClick={() => setIsViewerOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ height: "70vh" }}>
          {doc.previewUrl && (
            doc.type === "pdf" ? (
              <iframe
                src={doc.previewUrl}
                title={`Preview of ${doc.title || "document"}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
              />
            ) : (
              <img
                src={doc.previewUrl}
                alt={doc.title}
                style={{ maxWidth: "100%", maxHeight: "60vh", display: "block", margin: "0 auto" }}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* AI Assistant Modal */}
      <Dialog open={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          AI Assistant
          <IconButton
            aria-label="close"
            onClick={() => setIsAIAssistantOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {doc.aiSummary?.overview && (
            <Typography sx={{ mb: 2 }}>{doc.aiSummary.overview}</Typography>
          )}
          {doc.aiSummary?.vitals?.length > 0 && (
            <>
              <Typography variant="subtitle1">Vitals:</Typography>
              <ul>
                {doc.aiSummary.vitals.map((vital, idx) => (
                  <li
                    key={idx}
                    style={{
                      color:
                        vital.status?.toLowerCase() === "high"
                          ? "#d32f2f"
                          : vital.status?.toLowerCase() === "low"
                            ? "#1976d2"
                            : vital.status?.toLowerCase() === "normal"
                              ? "#388e3c"
                              : undefined,
                      fontWeight: vital.status?.toLowerCase() === "normal" ? "bold" : undefined
                    }}
                  >
                    {vital.name}: {vital.value} ({vital.status})
                  </li>
                ))}
              </ul>
            </>
          )}
          {doc.aiSummary?.analysis?.length > 0 && (
            <>
              <Typography variant="subtitle1">Analysis:</Typography>
              <ul>
                {doc.aiSummary.analysis.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {doc.aiSummary?.recommendations?.length > 0 && (
            <>
              <Typography variant="subtitle1">Recommendations:</Typography>
              <ol>
                {doc.aiSummary.recommendations.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ol>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Documents;
