import { React, useRef, useState, useEffect } from 'react';
import { FaEye, FaDownload, FaTimes, FaFilePdf, FaFileImage } from "react-icons/fa";
import { RiRobot2Line } from "react-icons/ri";
import { MdOutlineDocumentScanner } from "react-icons/md";
import { CiSearch } from "react-icons/ci";
import { gsap } from 'gsap';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

const Documents = () => {

  const cardsContainerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("nameAsc");
  const [categoryBy, setCategoryBy] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch documents from Firestore with better error handling
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // console.log('Attempting to fetch documents from Firestore...');
        
        // Check if db is properly initialized
        if (!db) {
          throw new Error('Firebase database not initialized');
        }

        const documentsCollection = collection(db, 'documents');
        // console.log('Documents collection reference created');

        const querySnapshot = await getDocs(documentsCollection);
        // console.log('Query snapshot received, document count:', querySnapshot.size);

        if (querySnapshot.empty) {
          // console.warn('No documents found in the collection');
          setDocuments([]);
          setLoading(false);
          return;
        }

        const docs = [];
        querySnapshot.forEach((docSnapshot) => {
          // console.log('Processing document:', docSnapshot.id);
          const data = docSnapshot.data();
          // console.log('Document data:', data);
          
          const processedDoc = {
            id: docSnapshot.id,
            title: data.title || '',
            patient: data.patient || '',
            type: data.type || '',
            size: data.size || '',
            url: data.url || '',
            previewUrl: data.previewUrl || '',
            category: data.category || '',
            aiSummary: data.aiSummary || null,
            // Handle Firestore Timestamp conversion more safely
            createdAt: data.createdAt ? 
              (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : 
              new Date(),
            updatedAt: data.updatedAt ? 
              (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : 
              new Date()
          };
          
          docs.push(processedDoc);
        });
        
        // console.log('Processed documents:', docs);
        setDocuments(docs);
        
      } catch (err) {
        // console.error('Detailed error fetching documents:', err);
        // console.error('Error code:', err.code);
        // console.error('Error message:', err.message);
        // console.error('Error stack:', err.stack);
        
        setError(`Failed to load documents: ${err.message}`);
      } finally {
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
      
      const newDoc = { 
        id: docRef.id, 
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setDocuments(prev => [...prev, newDoc]);
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
      const updatePayload = {
        ...updatedData,
        updatedAt: new Date()
      };
      
      await updateDoc(documentRef, updatePayload);
      
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, ...updatePayload } : doc
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

  function parseInputDate(input) {
    let date = new Date(input);
    if (!isNaN(date)) return date;
    const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = input.match(ddmmyyyy);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month}-${day}`);
    }
    return null;
  }

  const searchByOptions = {
    all: (doc) =>
      (doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.patient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type?.toLowerCase().includes(searchQuery.toLowerCase())) ?? false,

    name: (doc) => doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false,

    patient: (doc) => doc.patient?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false,

    type: (doc) => doc.type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false,
  };

  const sortByOptions = {
    nameAsc: (a, b) => (a.title || '').localeCompare(b.title || ''),
    nameDec: (a, b) => (b.title || '').localeCompare(a.title || ''),
    patientAsc: (a, b) => (a.patient || '').localeCompare(b.patient || ''),
    patientDec: (a, b) => (b.patient || '').localeCompare(a.patient || ''),
    dateAsc: (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
    dateDec: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    sizeAsc: (a, b) => parseFloat(a.size || '0') - parseFloat(b.size || '0'),
    sizeDec: (a, b) => parseFloat(b.size || '0') - parseFloat(a.size || '0'),
  };

  const categoryByOptions = {
    "all": (doc) => true, // No filtering by category
    "reports": (doc) => doc.category === "reports",
    "imaging": (doc) => doc.category === "imaging",
    "results": (doc) => doc.category === "results",
  }
  const categories = ["all", "reports", "imaging", "results"]; // Tab labels

  const filteredDocs = documents.filter((doc) =>
    searchByOptions[searchBy](doc) &&
    (searchQuery ? true : true) &&
    categoryByOptions[categoryBy](doc)
  ).sort(
    sortByOptions[sortBy] || sortByOptions.dateDec // Default to newest first
  );

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const indexOfLastDoc = currentPage * itemsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - itemsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirstDoc, indexOfLastDoc);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchBy, sortBy, categoryBy]);

  useEffect(() => {
    if (cardsContainerRef.current) {
      gsap.fromTo(
        cardsContainerRef.current.querySelectorAll('.document-card'),
        { opacity: 0.75, x: 25 },
        {
          opacity: 1,
          x: 0,
          duration: 0.25,
          stagger: 0.05,
          ease: 'power4.in'
        }
      );
    }
  }, [currentDocs]);

  // Debug render
  // console.log('Component render - Documents:', documents.length, 'Loading:', loading, 'Error:', error);

  return (
    <div className="bg-white dark:bg-gray-700 dark:text-white rounded-lg shadow-md md:p-6 py-6 px-2">

      {/* Sort and Search Filter */}
      <div className="flex lg:flex-row flex-col gap-2 mb-4">
        {/* Search Options */}
        <div className='flex flex-col min-[450px]:flex-row gap-2 md:gap-0 items-center w-full md:w-auto'>
          <div className='w-full'>
            <h2 className='inline-block font-bold px-4 text-nowrap'>Search By</h2>
            <select
              name="search"
              id="search"
              onChange={(e) => setSearchBy(e.target.value)}
              className="ml-2 px-3 py-2 border-2 border-slate-200 rounded-md transition-all focus:outline-none focus:border-blue-500 
               dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="name">Document Name</option>
              <option value="patient">Patient Name</option>
              <option value="type">Document Type</option>
            </select>
          </div>

          <div className='w-full'>
            <h2 className='inline-block font-bold px-4 text-nowrap'>Sort By</h2>
            <select name="search" onChange={(e) => {
              setSortBy(e.target.value);
            }} id="search" className="ml-2 px-3 py-2 border-2 border-slate-200 rounded-md transition-all focus:outline-none focus:border-blue-500 
               dark:bg-slate-700 dark:text-white">
              <option value="nameAsc">Document Name (A-Z)</option>
              <option value="nameDec">Document Name (Z-A)</option>
              <option value="patientAsc">Patient Name (A-Z)</option>
              <option value="patientDec">Patient Name (Z-A)</option>
              <option value="dateAsc">Date (Oldest)</option>
              <option value="dateDec">Date (Newest)</option>
              <option value="sizeAsc">Size (Smallest)</option>
              <option value="sizeDec">Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-4 ml-2 flex w-[90%] lg:w-[75%] items-center text-black dark:text-white border-2 border-slate-200 rounded-md focus:border-blue-500 transition-all focus-within:border-blue-500">
          <CiSearch className="text-xl text-amber-900 dark:text-slate-100  ml-2" />
          <input
            type="text"
            className="w-full px-3 py-2 bg-transparent focus:outline-none rounded-md"
            placeholder="Search Document..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="rounded-md px-1 py-1 w-full dark:bg-gray-700 md:w-fit">
        {/* Tabs */}
        <div className="flex flex-col min-[500px]:flex-row space-x-4">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg ${categoryBy === cat
                ? "dark:bg-slate-800 bg-slate-300 text-black dark:text-white"
                : "text-gray-800 dark:text-gray-100"
                } transition-all duration-300`}
              onClick={() => setCategoryBy(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <span className="ml-3">Loading documents...</span>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div
            ref={cardsContainerRef}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-1 py-4">
            {currentDocs.length > 0 ? (
              currentDocs.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} className="document-card" />
              ))
            ) : (
              <div className="text-center py-10 col-span-full">
                <h3 className="mt-2 text-lg font-medium">
                  {documents.length === 0 ? 'No documents found in database.' : 'No documents match your search criteria.'}
                </h3>
                {documents.length === 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Make sure your Firestore collection 'documents' contains data.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded ${currentPage === i + 1
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-600"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


const iconMap = {
  pdf: <FaFilePdf />,
  docx: <MdOutlineDocumentScanner />,
  png: <FaFileImage />,
  jpeg: <FaFileImage />,
  jpg: <FaFileImage />,
  default: <MdOutlineDocumentScanner />
};

const DocumentCard = ({ doc, className = "" }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const avatar = doc.patient
    ? doc.patient
        .split(" ")
        .filter(name => name.length > 0)
        .map((name) => name[0]?.toUpperCase() || '')
        .join("")
    : "";
    

  // format date in dd mm yyyy format
  function formatDate(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return `${day}-${month}-${year}`;
  }

  return (
    <>
      {/* Card */}
      <div className={`bg-white dark:bg-slate-800 dark:text-white p-4 rounded-2xl shadow hover:shadow-md shadow-gray-700 dark:hover:shadow-gray-300 dark:hover:bg-slate-900 hover:bg-gray-200 transition-all transform border border-gray-200 ${className}`}>
        {!!doc.title ? (
          <div className="flex items-center gap-2">
            <span className='text-2xl'>{iconMap[doc.type] || iconMap.default}</span>
            <h3 className="text-xl font-semibold text-black dark:text-white truncate text-wrap">{doc.title}</h3>
          </div>
        ) : (
          <h3 className="text-xl font-bold text-blue-800 dark:text-white">Medical Report</h3>
        )}

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          {!!doc.type && <span className="bg-gray-200 px-2 py-1 rounded-md uppercase">{doc.type}</span>}
          {!!doc.size && <span className="text-black dark:text-white">{doc.size}</span>}
        </div>

        {!!doc.patient && (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-800 font-bold rounded-full flex items-center justify-center">
              {avatar}
            </div>
            <span className="text-md font-medium">{doc.patient}</span>
          </div>
        )}

        {!!doc.updatedAt && <h3 className='mt-2 text-sm text-gray-600 dark:text-slate-300'>Updated: {formatDate(doc.updatedAt)}</h3>}

        <div className="flex flex-col min-[400px]:flex-row gap-2 mt-4 justify-around text-sm font-medium">
          {!!doc.previewUrl &&
            (<button
              onClick={() => setIsViewerOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FaEye /> View
            </button>)
          }

          {!!doc.url && (
            <button
              onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FaDownload className="inline-block" />
              Download
            </button>
          )}

          {!!doc.aiSummary && (
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
              <RiRobot2Line /> Ask AI
            </button>
          )}
        </div>
      </div>

      {/* Viewer Modal */}
      {isViewerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-5xl h-[80vh] overflow-hidden shadow-xl flex flex-col relative">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Document Preview</h2>
              <button
                onClick={() => setIsViewerOpen(false)}
                className="text-gray-500 hover:text-red-600 text-lg"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!!doc.previewUrl && (
                <iframe
                  src={doc.previewUrl}
                  className="w-full h-full"
                  title={`Preview of ${doc.title || 'document'}`}
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      {
        isAIAssistantOpen && doc.aiSummary && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-700 dark:text-white rounded-lg w-[90%] max-w-3xl max-h-screen h-fit overflow-y-auto shadow-xl flex flex-col relative">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">AI Assistant</h2>
                <button
                  onClick={() => setIsAIAssistantOpen(false)}
                  className="text-gray-500 hover:text-red-600 text-lg"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                {!!doc.aiSummary.overview && <p className="text-gray-700 dark:text-white mb-2">{doc.aiSummary.overview}</p>}

                {doc.aiSummary.vitals?.length > 0 && (
                  <>
                    <h3 className="font-semibold mb-1 text-gray-700 dark:text-white">Vitals:</h3>
                    <ul className="list-disc pl-5 mb-4">
                      {doc.aiSummary.vitals.map((vital, index) => {
                        const status = vital.status?.toLowerCase() || ''; // Normalize casing
                        let textColor = "text-gray-700";

                        if (status === "high") textColor = "text-red-600 dark:text-red-400 font-semibold";
                        else if (status === "low") textColor = "text-blue-600 dark:text-blue-400 font-semibold";
                        else if (status === "normal") textColor = "text-black font-medium dark:text-white";

                        return (
                          <li key={index} className={textColor}>
                            {vital.name}: {vital.value} ({vital.status})
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {doc.aiSummary.analysis?.length > 0 && (
                  <>
                    <h3 className="font-semibold mb-1 text-gray-700 dark:text-white">Analysis:</h3>
                    <ul className="list-disc pl-5 mb-4 text-black dark:text-white">
                      {doc.aiSummary.analysis.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}

                {doc.aiSummary.recommendations?.length > 0 && (
                  <>
                    <h3 className="font-semibold mb-1 text-gray-700 dark:text-white">Recommendations:</h3>
                    <ol className="list-decimal pl-5 text-black dark:text-white">
                      {doc.aiSummary.recommendations.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default Documents;