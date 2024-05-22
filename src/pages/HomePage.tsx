import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbList } from "@/lib/utils/ui/breadcrumb";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/lib/utils/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/lib/utils/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from "@/lib/utils/ui/dropdown-menu";
import { Button } from "@/lib/utils/ui/button";
import { File, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/lib/utils/ui/pagination";

interface Work {
  key?: string;
  title: string;
  author_names: string[];
  first_publish_year?: number;
  subjects?: string[];
}

interface Entry {
  work?: Work;
}

interface AuthorInfo {
  authorDOB?: string;
  authorTopWork?: string;
}

interface RatingInfo {
  averageRating?: number;
}

const HomePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["book"],
    queryFn: () => fetch("https://openlibrary.org/people/mekBot/books/already-read.json").then((res) => res.json()),
  });

  const [authorInfo, setAuthorInfo] = useState<{ [authorName: string]: AuthorInfo }>({});
  const [ratingsInfo, setRatingsInfo] = useState<{ [workId: string]: RatingInfo }>({});
  const [subjects, setSubjects] = useState<{ [workId: string]: string }>({});
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<{ field: string, order: 'asc' | 'desc' }>({ field: '', order: 'asc' });

  useEffect(() => {
    const fetchAuthorInfo = async (authorName: string) => {
      try {
        const response = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}`);
        const data = await response.json();
        if (data && data.docs && data.docs.length > 0) {
          const author = data.docs.find((doc: { name: string }) => doc.name.toLowerCase() === authorName.toLowerCase());
          if (author) {
            const authorDOB = author.birth_date || "Unknown";
            const authorTopWork = author.top_work || "Unknown";
            setAuthorInfo((prev) => ({
              ...prev,
              [authorName]: { authorDOB, authorTopWork },
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching author info:", error);
      }
    };

    const fetchRatingInfo = async (workId: string) => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${workId}/ratings.json`);
        const data = await response.json();
        if (data && data.summary && data.summary.average) {
          const averageRating = parseFloat(data.summary.average).toFixed(1);
          setRatingsInfo((prev) => ({
            ...prev,
            [workId]: { averageRating: parseFloat(averageRating) },
          }));
        }
      } catch (error) {
        console.error("Error fetching rating info:", error);
      }
    };

    const fetchSubjects = async (workId: string) => {
      try {
        const response = await fetch(`https://openlibrary.org/works/${workId}.json`);
        const data = await response.json();
        if (data && data.subjects) {
          const firstSubject = data.subjects[0]?.split(',')[0] || 'Unknown';
          setSubjects((prev) => ({
            ...prev,
            [workId]: firstSubject,
          }));
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };

    if (data && data.reading_log_entries) {
      data.reading_log_entries.forEach((entry: Entry) => {
        const { work } = entry;
        if (work) {
          const { author_names, key } = work;
          if (author_names && author_names.length > 0) {
            author_names.forEach((authorName: string) => {
              if (!authorInfo[authorName]) {
                fetchAuthorInfo(authorName);
              }
            });
          }
          if (key) {
            const workId = key.split("/").pop() || "";
            if (!ratingsInfo[workId]) {
              fetchRatingInfo(workId);
            }
            if (!subjects[workId]) {
              fetchSubjects(workId);
            }
          }
        }
      });
    }
  }, [data, authorInfo, ratingsInfo, subjects]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const handleSortChange = (field: string) => {
    setSortBy(prevSort => ({
      field,
      order: prevSort.field === field ? (prevSort.order === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error fetching data</div>;
  if (!data || !data.reading_log_entries) return <div>No data available</div>;

  let filteredEntries = data.reading_log_entries.filter((entry: Entry) => (
    entry.work && entry.work.title && entry.work.author_names && entry.work.author_names.length > 0
  ));

  if (sortBy.field) {
    filteredEntries = [...filteredEntries].sort((a: Entry, b: Entry) => {
      const aValue = a.work ? a.work[sortBy.field as keyof Work] || '' : '';
      const bValue = b.work ? b.work[sortBy.field as keyof Work] || '' : '';
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortBy.order === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      if (sortBy.order === 'asc') {
        return String(aValue).localeCompare(String(bValue));
      } else {
        return String(bValue).localeCompare(String(aValue));
      }
    });
  }

  const pageCount = Math.ceil(filteredEntries.length / pageSize);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportToCSV = () => {
    const entries: Work[] = paginatedEntries.map((entry: Entry) => {
      const { work } = entry;
      if (!work) return null;
      const { title, author_names, first_publish_year } = work;
      const workId = work.key?.split("/").pop() || "";
      const ratingsInfoForWork = ratingsInfo[workId] || {};
      const { averageRating } = ratingsInfoForWork;
      const authorsDOB = author_names?.map((authorName) => authorInfo[authorName]?.authorDOB || "Unknown").join(", ");
      const authorTopWork = author_names?.map((authorName) => authorInfo[authorName]?.authorTopWork || "Unknown").join(", ");
      const subject = subjects[workId] || 'Unknown';
      const publishYear = first_publish_year || 'Unknown';
      return {
        "Ratings Average": averageRating || "Unknown",
        "Author Name": author_names.join(", "),
        "Title": title,
        "First Publish Year": publishYear,
        "Subjects": subject,
        "Author Birth Date": authorsDOB,
        "Author Top Work": authorTopWork
      };
    }).filter((entry: Work | null): entry is Work => entry !== null);

    const csvData = [Object.keys(entries[0]), ...entries.map(entry => Object.values(entry))];

    const csvContent = "data:text/csv;charset=utf-8," + csvData.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "books.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <>
      <div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Books</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/components">Books List</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <Button size="sm" variant="outline" className="h-8 gap-1 float-right" onClick={exportToCSV}>
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Books List</CardTitle>
            <CardDescription>Manage your Book Record</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('averageRating')}>
                      Ratings Average {sortBy.field === 'averageRating' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('author_names')}>
                      Author Name {sortBy.field === 'author_names' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('title')}>
                      Title {sortBy.field === 'title' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('first_publish_year')}>
                      First Publish Year {sortBy.field === 'first_publish_year' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('subjects')}>
                      Subjects {sortBy.field === 'subjects' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('authorDOB')}>
                      Author Birth Date {sortBy.field === 'authorDOB' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSortChange('authorTopWork')}>
                      Author Top Work {sortBy.field === 'authorTopWork' ? (sortBy.order === 'asc' ? <ArrowUp /> : <ArrowDown />) : ''}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.map((entry: Entry, index: number) => {
                  const { work } = entry;
                  if (!work) return null;
                  const { title, author_names, first_publish_year } = work;
                  const workId = work.key?.split("/").pop() || "";
                  const ratingsInfoForWork = ratingsInfo[workId] || {};
                  const { averageRating } = ratingsInfoForWork;
                  const authorsDOB = author_names?.map((authorName) => authorInfo[authorName]?.authorDOB || "Unknown").join(", ");
                  const authorTopWork = author_names?.map((authorName) => authorInfo[authorName]?.authorTopWork || "Unknown").join(", ");
                  const subject = subjects[workId] || 'Unknown';
                  const publishYear = first_publish_year || 'Unknown';
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{averageRating || "Unknown"}</TableCell>
                      <TableCell className="font-medium">{author_names.join(", ")}</TableCell>
                      <TableCell className="font-medium">{title}</TableCell>
                      <TableCell className="font-medium">{publishYear}</TableCell>
                      <TableCell className="font-medium">{subject}</TableCell>
                      <TableCell className="font-medium">{authorsDOB}</TableCell>
                      <TableCell className="font-medium">{authorTopWork}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredEntries.length)}</strong> of <strong>{filteredEntries.length}</strong> products
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, i) => (
                  <PaginationLink href="#" onClick={() => handlePageChange(i + 1)}>
                    {i + 1}
                  </PaginationLink>
                ))}
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="mt-4 flex items-center space-x-4">
              <span>Records per page:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="flex items-center">
                    <span>{pageSize}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 12a1 1 0 01-1-1V7a1 1 0 011.5-.87l4 2a1 1 0 010 1.74l-4 2A1 1 0 0110 12zm-2-3.28V7.28L5.07 10 8 12.72zM3 14h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Select Records per page</DropdownMenuLabel>
                  <div className="mt-4 flex items-center space-x-4">
                  <DropdownMenuItem onClick={() => handlePageSizeChange(10)}>10</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePageSizeChange(50)}>50</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePageSizeChange(100)}>100</DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default HomePage;

