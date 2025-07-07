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



// Firebase Storage imports
import { getStorage, ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";



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


  // Fetch documents from Firebase Storage /medical-records
  // Only show documents present in Firebase Storage, not from Firestore or mock data
  useEffect(() => {
    const fetchStorageDocuments = async () => {
      setLoading(true);
      setError(null);
      try {
        const storage = getStorage();
        const recordsRef = ref(storage, 'medical-records');
        const res = await listAll(recordsRef);
        console.log('listAll result:', res);
        let allFiles = [...res.items];
        // Recursively get files from all subfolders
        for (const folderRef of res.prefixes) {
          const subRes = await listAll(folderRef);
          allFiles = allFiles.concat(subRes.items);
        }
        if (allFiles.length === 0) {
          console.warn('No files found in /medical-records/ or its subfolders');
        }
        const docs = await Promise.all(
          allFiles.map(async (fileRef) => {
            try {
              const url = await getDownloadURL(fileRef);
              let meta = {};
              try {
                meta = await getMetadata(fileRef);
              } catch (e) {
                console.warn('No metadata for', fileRef.name, e);
              }
              // Extract file info
              const name = fileRef.name;
              const ext = name.split('.').pop()?.toLowerCase() || '';
              // Try to get size from metadata
              let size = '';
              if (meta.size) {
                size = (meta.size / 1024).toFixed(0) + ' KB';
              }
              // Try to get updated date
              let updatedAt = '';
              if (meta.updated) {
                updatedAt = meta.updated;
              }
              return {
                id: fileRef.fullPath,
                title: name,
                type: ext,
                url,
                previewUrl: url,
                size,
                updatedAt,
                // patient, category, 
              };
            } catch (fileErr) {
              console.error('Error processing file', fileRef.name, fileErr);
              return null;
            }
          })
        );
        setDocuments(docs.filter(Boolean));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching storage documents:', err);
        setError('Failed to load documents from storage');
        setLoading(false);
      }
    };
    fetchStorageDocuments();
  }, []);

  

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
                    ? "No documents found in Firebase Storage."
                    : "No documents match your search criteria."}
                </Typography>
                {documents.length === 0 && (
                  <Typography align="center" variant="body2" color="text.secondary">
                    Make sure your Firebase Storage 'medical-records' folder contains files.
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
